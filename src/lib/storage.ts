import { createHash } from "node:crypto";

import { getSettings } from "../lib/settings.ts";
import { getStoragePath } from "../lib/utils.ts";

export type FileRestriction =
	| { type: "user"; id: string }
	| { type: "role"; id: string }
	| { type: "key"; key: string }
	| null;

export interface FileEntry {
	id: string;
	name: string;
	size: number;
	mimeType: string | null;
	sha256: string;
	uploader: string;
	uploadKey: string;
	uploaded: boolean;
	createdAt: string;
	expiresAt: string | null;
	maxDownloads: number | null;
	downloadCount: number;
	description: string | null;
	restrictedTo: FileRestriction;
	downloadTokens: Record<string, number>;
};

export interface StorageStats {
	totalFiles: number;
	usedSize: number;
	maxCapacity: number;
	freeSize: number;
	oldestFile: FileEntry | null;
};

export const getStorageConfig = () => {
	const isDev = Deno.env.get("CLIENT") === "dev";
	try {
		const storage = getSettings().storage;
		return {
			maxCapacity: storage?.maxCapacity ?? 100 * 1024 * 1024 * 1024,
			tokenLifetime: storage?.tokenLifetime ?? 5 * 60 * 1000,
			slotExpiry: storage?.slotExpiry ?? 24 * 60 * 60 * 1000,
			baseURL: storage?.baseURL ?? (isDev ? "http://localhost:2011" : "https://onion.wixonic.fr"),
			apiURL: storage?.apiURL ?? (isDev ? "http://localhost:1202" : "https://api.onion.wixonic.fr")
		};
	} catch {
		return {
			maxCapacity: 100 * 1024 * 1024 * 1024,
			tokenLifetime: 5 * 60 * 1000,
			slotExpiry: 24 * 60 * 60 * 1000,
			baseURL: isDev ? "http://localhost:2011" : "https://onion.wixonic.fr",
			apiURL: isDev ? "http://localhost:1202" : "https://api.onion.wixonic.fr"
		};
	}
};

const index = new Map<string, FileEntry>();
let initialized = false;

const loadIndex = async () => {
	try {
		const data = await Deno.readTextFile(getStoragePath("files", "index.json"));
		const parsed: (FileEntry & { uploaderId?: string; uploaderName?: string })[] = JSON.parse(data);
		index.clear();
		for (const file of parsed) {
			if (!file.uploader && file.uploaderId) file.uploader = file.uploaderId;
			delete file.uploaderId;
			delete file.uploaderName;
			index.set(file.id, file);
		}
	} catch {
		index.clear();
	}
};

let saveQueue: Promise<void> = Promise.resolve();

const saveIndex = (): Promise<void> => {
	const execute = async () => {
		const temporaryPath = getStoragePath("files", `index.${crypto.randomUUID()}.tmp`);
		try {
			await Deno.writeTextFile(temporaryPath, JSON.stringify(Array.from(index.values()), null, "\t"));
			await Deno.rename(temporaryPath, getStoragePath("files", "index.json"));
		} catch (error) {
			await Deno.remove(temporaryPath).catch(() => { });
			throw error;
		}
	};

	const next = saveQueue.then(execute, execute);
	saveQueue = next.catch(() => { });
	return next;
};

const ensureReady = async () => {
	if (initialized) return;
	await Deno.mkdir(getStoragePath("files", "data"), { recursive: true });
	await loadIndex();
	initialized = true;
};

const removeFile = async (id: string) => {
	try { await Deno.remove(getStoragePath("files", "data", id)); } catch { /* ignore */ }
};

const getUploadedFiles = (): FileEntry[] =>
	Array.from(index.values()).filter((f) => f.uploaded);

const getTotalUsedSize = (): number => {
	let total = 0;
	for (const f of index.values()) if (f.uploaded) total += f.size;
	return total;
};

export const cleanupExpired = async () => {
	const now = Date.now();
	const { slotExpiry } = getStorageConfig();
	let changed = false;

	for (const [id, file] of index) {
		for (const [token, expiry] of Object.entries(file.downloadTokens)) {
			if (expiry <= now) {
				delete file.downloadTokens[token];
				changed = true;
			}
		}

		const expired = (file.expiresAt && new Date(file.expiresAt).getTime() <= now)
			|| (file.maxDownloads !== null && file.downloadCount >= file.maxDownloads)
			|| (!file.uploaded && new Date(file.createdAt).getTime() + slotExpiry <= now);

		if (expired) {
			await removeFile(id);
			index.delete(id);
			changed = true;
		}
	}

	if (changed) await saveIndex();
};

export const createSlot = async (options: {
	uploader: string;
	description?: string | null;
	expiresIn?: number | null;
	maxDownloads?: number | null;
	restrictedTo?: FileRestriction;
}): Promise<{ file: FileEntry; uploadKey: string }> => {
	await ensureReady();
	await cleanupExpired();

	let id = crypto.randomUUID().slice(0, 8);
	while (index.has(id)) id = crypto.randomUUID().slice(0, 8);

	const uploadKey = crypto.randomUUID().replaceAll("-", "");

	const file: FileEntry = {
		id,
		name: `file-${id}`,
		size: 0,
		mimeType: null,
		sha256: "",
		uploader: options.uploader,
		uploadKey,
		uploaded: false,
		createdAt: new Date().toISOString(),
		expiresAt: options.expiresIn ? new Date(Date.now() + options.expiresIn).toISOString() : null,
		maxDownloads: options.maxDownloads ?? null,
		downloadCount: 0,
		description: options.description ?? null,
		restrictedTo: options.restrictedTo ?? null,
		downloadTokens: {}
	};

	index.set(id, file);
	await saveIndex();
	return { file, uploadKey };
};

export const uploadFileStream = async (
	fileId: string,
	uploadKey: string,
	stream: ReadableStream<Uint8Array>,
	fileName?: string,
	mimeType?: string
): Promise<FileEntry> => {
	await ensureReady();
	await cleanupExpired();

	const file = index.get(fileId);
	if (!file) throw new Error("FILE_NOT_FOUND");
	if (file.uploadKey !== uploadKey) throw new Error("INVALID_UPLOAD_KEY");
	if (file.uploaded) throw new Error("ALREADY_UPLOADED");

	const { maxCapacity } = getStorageConfig();

	const tempPath = getStoragePath("files", "data", `${fileId}.tmp`);
	const targetPath = getStoragePath("files", "data", fileId);

	const hasher = createHash("sha256");
	let size = 0;

	const destination = await Deno.open(tempPath, { write: true, create: true, truncate: true });

	try {
		const reader = stream.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxCapacity) {
				throw new Error("FILE_TOO_LARGE");
			}
			hasher.update(value);
			await destination.write(value);
		}
	} catch (err) {
		destination.close();
		await Deno.remove(tempPath).catch(() => { });
		throw err;
	}
	destination.close();

	if (size === 0) {
		await Deno.remove(tempPath).catch(() => { });
		throw new Error("EMPTY_FILE");
	}

	const sha256 = hasher.digest("hex");

	for (const [existingId, existing] of index) {
		if (existing.uploaded && existing.sha256 === sha256 && existingId !== fileId) {
			await Deno.remove(tempPath).catch(() => { });
			throw new Error("DUPLICATE_FILE");
		}
	}

	let usedSize = getTotalUsedSize();
	if (usedSize + size > maxCapacity) {
		const candidates = getUploadedFiles()
			.filter((f) => f.id !== fileId)
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

		for (const old of candidates) {
			if (usedSize + size <= maxCapacity) break;
			await removeFile(old.id);
			index.delete(old.id);
			usedSize -= old.size;
		}

		if (usedSize + size > maxCapacity) {
			await Deno.remove(tempPath).catch(() => { });
			throw new Error("STORAGE_FULL");
		}
	}

	await Deno.rename(tempPath, targetPath);

	file.uploaded = true;
	file.size = size;
	file.sha256 = sha256;
	file.createdAt = new Date().toISOString();
	if (fileName) file.name = fileName;

	file.mimeType = (!mimeType || mimeType === "application/octet-stream") ? "Unknown type" : mimeType || "application/octet-stream";

	await saveIndex();
	return file;
};

export const uploadFile = async (fileId: string, uploadKey: string, data: Uint8Array, fileName?: string, mimeType?: string): Promise<FileEntry> => {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(data);
			controller.close();
		}
	});
	return await uploadFileStream(fileId, uploadKey, stream, fileName, mimeType);
};

export const getFile = async (fileId: string): Promise<FileEntry | null> => {
	await ensureReady();
	await cleanupExpired();
	const file = index.get(fileId);
	return (file && file.uploaded) ? file : null;
};

export const getFileRaw = async (fileId: string): Promise<FileEntry | null> => {
	await ensureReady();
	await cleanupExpired();
	return index.get(fileId) ?? null;
};

export const getFilePath = (fileId: string): string => getStoragePath("files", "data", fileId);

export const getDeletionQueuePosition = async (fileId: string): Promise<number> => {
	await ensureReady();
	const sorted = getUploadedFiles().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	const pos = sorted.findIndex((f) => f.id === fileId);
	return pos >= 0 ? pos + 1 : 0;
};

export const getStorageStats = async (): Promise<StorageStats> => {
	await ensureReady();
	await cleanupExpired();

	const { maxCapacity } = getStorageConfig();
	const uploaded = getUploadedFiles().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	let usedSize = 0;
	for (const f of uploaded) usedSize += f.size;

	return {
		totalFiles: uploaded.length,
		usedSize,
		maxCapacity,
		freeSize: Math.max(0, maxCapacity - usedSize),
		oldestFile: uploaded[0] ?? null
	};
};

export const canUserDownload = (file: FileEntry, userId?: string, memberRoleIds?: string[], providedKey?: string): boolean => {
	if (!file.restrictedTo) return true;

	if (providedKey && file.uploadKey === providedKey) return true;

	const hasValidToken = providedKey && file.downloadTokens[providedKey] && file.downloadTokens[providedKey] > Date.now();

	if (file.restrictedTo.type === "key")
		return (providedKey !== undefined && file.restrictedTo.key === providedKey) || !!hasValidToken;

	if (userId && file.uploader === userId) return true;

	if (file.restrictedTo.type === "user")
		return (userId !== undefined && file.restrictedTo.id === userId) || !!hasValidToken;

	if (file.restrictedTo.type === "role")
		return (memberRoleIds !== undefined && memberRoleIds.includes(file.restrictedTo.id)) || !!hasValidToken;

	return false;
};

export const generateDownloadToken = async (fileId: string): Promise<string | null> => {
	await ensureReady();
	const file = index.get(fileId);
	if (!file) return null;

	const { tokenLifetime } = getStorageConfig();
	const token = crypto.randomUUID().replaceAll("-", "");
	file.downloadTokens[token] = Date.now() + tokenLifetime;
	await saveIndex();
	return token;
};

export const consumeDownload = async (fileId: string, providedKey?: string, userId?: string, memberRoleIds?: string[]): Promise<{ filePath: string; file: FileEntry } | null> => {
	await ensureReady();
	await cleanupExpired();

	const file = index.get(fileId);
	if (!file || !file.uploaded) return null;
	if (!canUserDownload(file, userId, memberRoleIds, providedKey)) return null;

	if (providedKey && file.downloadTokens[providedKey]) delete file.downloadTokens[providedKey];

	file.downloadCount++;
	const filePath = getStoragePath("files", "data", fileId);

	if (file.maxDownloads !== null && file.downloadCount >= file.maxDownloads) {
		index.delete(fileId);
		await saveIndex();
		return { filePath, file };
	}

	await saveIndex();
	return { filePath, file };
};

export const deleteFile = async (fileId: string, userId?: string, isAdmin = false): Promise<boolean> => {
	await ensureReady();
	const file = index.get(fileId);
	if (!file) return false;
	if (!isAdmin && userId && file.uploader !== userId) return false;

	await removeFile(fileId);
	index.delete(fileId);
	await saveIndex();
	return true;
};

export const listUserAccessibleFiles = async (userId: string, memberRoleIds: string[] = []): Promise<FileEntry[]> => {
	await ensureReady();
	await cleanupExpired();
	return getUploadedFiles()
		.filter((f) => canUserDownload(f, userId, memberRoleIds))
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};