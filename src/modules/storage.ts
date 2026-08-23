import type { Handler } from "../../Server/src/main.ts";
import { config } from "../../Server/src/config.ts";

import { client } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";
import { consumeDownload, getDeletionQueuePosition, getFile, getFileRaw, getStorageConfig, getStorageStats, uploadFile } from "../lib/storage.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
};

export const handler: Handler = {
	domain: config.isDevEnvironment ? "localhost:1202" : "api.onion.wixonic.fr",
	origin: "*",
	path: "*",
	handle: async (_logger: Logger, request: Request) => {
		const url = new URL(request.url);
		const pathname = url.pathname.replace(/\/+$/, "") || "/";
		const parts = pathname.split("/").filter(Boolean);

		if (parts.length === 1) {
			const fileId = parts[0];

			if (request.method === "GET") {
				const file = await getFile(fileId);
				if (!file) return Response.json({ error: "File not found" }, { status: 404, headers: corsHeaders });

				const stats = await getStorageStats();
				const fifoPosition = await getDeletionQueuePosition(fileId);
				const user = await client.getUser(file.uploader);

				return Response.json({
					id: file.id,
					name: file.name,
					size: file.size,
					mimeType: file.mimeType,
					sha256: file.sha256,
					uploader: user ? {
						id: user.id,
						username: user.username,
						displayName: user.displayName,
						displayNameStyle: await user.displayNameStyle(),
						avatar: user.avatar("webp", 256, false),
						avatarDecoration: user.avatarDecoration(false)
					} : {
						id: file.uploader,
						username: null,
						displayName: null,
						displayNameStyle: null,
						avatar: null,
						avatarDecoration: null
					},
					createdAt: file.createdAt,
					expiresAt: file.expiresAt,
					maxDownloads: file.maxDownloads,
					downloadCount: file.downloadCount,
					description: file.description,
					isPublic: file.restrictedTo === null,
					fifoPosition,
					storage: {
						usedSize: stats.usedSize,
						maxCapacity: stats.maxCapacity
					}
				}, { headers: corsHeaders });
			}
		}

		if (parts.length === 2) {
			const [fileId, action] = parts;

			if (action === "upload" && request.method === "POST") {
				const key = url.searchParams.get("key");
				if (!key) return Response.json({ error: "Missing upload key" }, { status: 400, headers: corsHeaders });

				let data: Uint8Array;
				let fileName: string | undefined;
				let mimeType: string | undefined;

				const contentType = request.headers.get("content-type") || "";

				if (contentType.includes("multipart/form-data")) {
					try {
						const formData = await request.formData();
						const formFile = formData.get("file");

						if (!(formFile instanceof File)) return Response.json({ error: "Missing file field in form data" }, { status: 400, headers: corsHeaders });

						data = new Uint8Array(await formFile.arrayBuffer());
						fileName = formFile.name;
						mimeType = formFile.type || "application/octet-stream";
					} catch (error) {
						return Response.json({ error: "Invalid multipart form data", details: String(error) }, { status: 400, headers: corsHeaders });
					}
				} else {
					data = new Uint8Array(await request.arrayBuffer());
					fileName = url.searchParams.get("name") || undefined;
					mimeType = contentType || "application/octet-stream";
				}

				if (data.length === 0) return Response.json({ error: "Empty file payload" }, { status: 400, headers: corsHeaders });

				try {
					const file = await uploadFile(fileId, key, data, fileName, mimeType);
					const { baseUrl } = getStorageConfig();
					return Response.json({
						success: true,
						id: file.id,
						name: file.name,
						size: file.size,
						mimeType: file.mimeType,
						sha256: file.sha256,
						url: `${baseUrl}/files/${file.id}`
					}, { headers: corsHeaders });
				} catch (error) {
					if (error instanceof Error) {
						if (error.message === "INVALID_UPLOAD_KEY") return Response.json({ error: "Invalid upload key" }, { status: 401, headers: corsHeaders });
						if (error.message === "FILE_NOT_FOUND") return Response.json({ error: "File slot not found" }, { status: 404, headers: corsHeaders });
						if (error.message === "ALREADY_UPLOADED") return Response.json({ error: "File already uploaded" }, { status: 400, headers: corsHeaders });
						if (error.message === "DUPLICATE_FILE") return Response.json({ error: "A file with matching SHA-256 already exists" }, { status: 409, headers: corsHeaders });
						if (error.message === "FILE_TOO_LARGE") return Response.json({ error: "File exceeds total storage capacity" }, { status: 413, headers: corsHeaders });
						if (error.message === "STORAGE_FULL") return Response.json({ error: "Storage capacity reached" }, { status: 507, headers: corsHeaders });
					}

					return Response.json({ error: "Upload failed", details: String(error) }, { status: 500, headers: corsHeaders });
				}
			}

			if (action === "download" && request.method === "GET") {
				const key = url.searchParams.get("key") || undefined;
				const download = await consumeDownload(fileId, key);

				if (!download) {
					const rawFile = await getFileRaw(fileId);
					if (!rawFile || !rawFile.uploaded) return Response.json({ error: "File not found" }, { status: 404, headers: corsHeaders });
					return Response.json({ error: "Unauthorized access or expired key" }, { status: 403, headers: corsHeaders });
				}

				try {
					const fileBuffer = await Deno.readFile(download.filePath);
					const encodedName = encodeURIComponent(download.file.name);

					return new Response(fileBuffer, {
						status: 200,
						headers: {
							"Content-Type": download.file.mimeType || "application/octet-stream",
							"Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
							"Content-Length": String(fileBuffer.length),
							...corsHeaders
						}
					});
				} catch {
					return Response.json({ error: "Error reading file" }, { status: 500, headers: corsHeaders });
				}
			}

			if (action === "card.webp" && request.method === "GET") {
				const file = await getFile(fileId);
				if (!file) return Response.json({ error: "File not found" }, { status: 404, headers: corsHeaders });

				const user = file.uploader ? await client.getUser(file.uploader) : null;
				const fifoPosition = await getDeletionQueuePosition(fileId);

				const cardBuffer = await generateRichPicture({
					type: RichPictureType.StorageFile,
					data: {
						name: file.name,
						mimeType: file.mimeType,
						size: file.size,
						fifoPosition,
						uploader: user ? {
							username: user.username,
							displayName: user.displayName,
							avatarUrl: user.avatar("webp", 256, false),
							avatarDecorationUrl: user.avatarDecoration(false) ?? undefined,
							displayNameStyle: await user.displayNameStyle()
						} : undefined
					}
				});

				return new Response(new Uint8Array(cardBuffer), {
					status: 200,
					headers: {
						"Content-Type": "image/webp",
						"Cache-Control": "public, max-age=60",
						...corsHeaders
					}
				});
			}
		}

		return Response.json({ error: "Not found" }, { status: 404, headers: corsHeaders });
	}
};