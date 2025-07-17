import { FilesetResolver, FaceLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const SERVER_URL = "wss://localhost:999/video/camera/";
const FACE_DETECTION_FPS = 30;

let canvas2D, ctx2D;
let canvas3D;

let ws, decoder, currentFrame;

let scene, camera, renderer;
let ambientLight, primaryDirectionalLight, secondaryDirectionalLight;

let head, leftEye, rightEye, body, leftArm, rightArm;
const eyeMaterials = [];
let headTargetPosition, headTargetQuaternion, leftEyeTargetPosition, rightEyeTargetPosition;

const models = {};
let lastDetect = 0;

const initCanvas = async () => {
	canvas2D = document.querySelector("#canvas2D");
	ctx2D = canvas2D.getContext("2d");
	canvas3D = document.querySelector("#canvas3D");

	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer({ canvas: canvas3D, antialias: true });
	renderer.setClearAlpha(0);

	camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
	camera.position.set(0, 0, 1);
	scene.add(camera);

	ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

	primaryDirectionalLight = new THREE.DirectionalLight(0xffffff, 3);
	primaryDirectionalLight.position.set(4, 5, 10);

	secondaryDirectionalLight = new THREE.DirectionalLight(0xffffff, 1);
	secondaryDirectionalLight.position.set(-5, 2, 5);

	scene.add(ambientLight, primaryDirectionalLight, secondaryDirectionalLight);

	const gltfLoader = new GLTFLoader();
	head = await new Promise((resolve) => gltfLoader.load("./head.glb", (gltf) => resolve(gltf.scene.children[0])));
	head.position.set(0, 0, 0);

	const textureLoader = new THREE.TextureLoader();
	const eyeTextures = ["./eye/default/", "./eye/blink/", "./eye/happy/"];
	for (const path of eyeTextures) {
		const color = await textureLoader.loadAsync(path + "color.png");
		const alpha = await textureLoader.loadAsync(path + "alpha.png");

		eyeMaterials.push(new THREE.MeshBasicMaterial({
			map: color,
			alphaMap: alpha,
			transparent: true
		}));
	}

	const eyeGeometry = new THREE.PlaneGeometry(0.1, 0.1);
	leftEye = new THREE.Mesh(eyeGeometry, eyeMaterials[0]);
	rightEye = new THREE.Mesh(eyeGeometry, eyeMaterials[0]);

	leftEye.initalPosition = new THREE.Vector3(-0.07, 0, 0.245);
	rightEye.initalPosition = new THREE.Vector3(0.07, 0, 0.245);

	leftEye.position.set(leftEye.initalPosition.x, leftEye.initalPosition.y, leftEye.initalPosition.z);
	rightEye.position.set(rightEye.initalPosition.x, rightEye.initalPosition.y, rightEye.initalPosition.z);

	leftEye.currentEye = rightEye.currentEye = 0;
	head.add(leftEye, rightEye);

	scene.add(head);

	const resize = () => {
		const width = innerWidth;
		const height = innerHeight;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
		renderer.setPixelRatio(devicePixelRatio);

		canvas3D.width = canvas2D.width = width * devicePixelRatio;
		canvas3D.height = canvas2D.height = height * devicePixelRatio;
	};

	resize();
	window.addEventListener("resize", resize);
};

const initModels = async () => {
	try {
		const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");

		models.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
			baseOptions: {
				modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
				delegate: "CPU"
			},
			numFaces: 1,
			runningMode: "VIDEO",
			outputFaceBlendshapes: true,
			outputFacialTransformationMatrixes: true
		});
	} catch (e) {
		console.error("Models initialization failed:", e);
		setTimeout(initModels, 3000);
	}
};

const initEncoder = () => {
	if (decoder) decoder.close();

	decoder = new VideoDecoder({
		output: (frame) => {
			if (currentFrame instanceof VideoFrame) currentFrame.close();
			currentFrame = frame;
		},
		error: (e) => {
			console.error("Decoder error:", e);
			if (decoder.state != "closed") decoder.close();
			initEncoder();
		}
	});

	decoder.configure({
		codec: "avc1.64001F",
		optimizeForLatency: true,
		hardwareAcceleration: "prefer-hardware"
	});
};

const connect = async () => {
	ws = new WebSocket(SERVER_URL);
	ws.binaryType = "arraybuffer";

	ws.addEventListener("message", (event) => {
		const data = new Uint8Array(event.data);

		let isKeyFrame = false;
		if (data.length > 4) {
			for (let i = 0; i < data.length - 4; i++) {
				if (data[i] === 0x00 && data[i + 1] === 0x00 && data[i + 2] === 0x00 && data[i + 3] === 0x01) {
					const nalType = data[i + 4] & 0x1F;
					isKeyFrame = (nalType === 5 || nalType === 7);
					break;
				}
			}
		}

		const chunk = new EncodedVideoChunk({
			type: isKeyFrame ? "key" : "delta",
			timestamp: performance.now(),
			data
		});

		decoder.decode(chunk);
	});

	ws.addEventListener("close", reconnect);
};

const reconnect = async () => {
	await new Promise(resolve => setTimeout(resolve, 2000));
	await connect();
};

let lastFrame = performance.now();
const loop = async () => {
	const now = performance.now();
	const delta = (now - lastFrame) / 1000;
	lastFrame = now;

	ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
	if (currentFrame instanceof VideoFrame) {
		ctx2D.save();
		ctx2D.scale(-1, 1);
		ctx2D.drawImage(currentFrame, 0, 0, canvas2D.width, canvas2D.height);
		ctx2D.restore();

		if (now - lastDetect >= 1000 / FACE_DETECTION_FPS) {
			lastDetect = now;

			try {
				models.faceLandmarker.result = await models.faceLandmarker.detect(currentFrame);
			} catch (e) {
				console.warn("Face landmarker error:", e);
			}
		}

		const scale = Math.min(canvas2D.width, canvas2D.height) / 500 * devicePixelRatio;

		const log = [];

		if (models.faceLandmarker && models.faceLandmarker.result) {
			const face = {
				landmarks: models.faceLandmarker.result.faceLandmarks[0],
				blendShapes: models.faceLandmarker.result.faceBlendshapes[0],
				matrix: models.faceLandmarker.result.facialTransformationMatrixes[0]
			};

			if (face.landmarks) {
				const eyeRange = (left, right) => {
					return {
						left: face.landmarks[left],
						right: face.landmarks[right],
						get top() {
							return {
								x: this.leftAndRightMiddle.x,
								y: this.leftAndRightMiddle.y - this.leftAndRightDistance.x / 4
							};
						},
						get bottom() {
							return {
								x: this.leftAndRightMiddle.x,
								y: this.leftAndRightMiddle.y - this.leftAndRightDistance.x / 8
							};
						},


						get leftAndRightMiddle() {
							return {
								x: (this.left.x + this.right.x) / 2,
								y: (this.left.y + this.right.y) / 2
							};
						},
						get leftAndRightDistance() {
							return {
								x: Math.abs(this.left.x - this.right.x),
								y: Math.abs(this.left.y - this.right.y)
							};
						},
						get topAndBottomMiddle() {
							return {
								x: (this.top.x + this.top.x) / 2,
								y: (this.bottom.y + this.bottom.y) / 2
							};
						},
						get topAndBottomDistance() {
							return {
								x: Math.abs(this.top.x - this.bottom.x),
								y: Math.abs(this.top.y - this.bottom.y)
							};
						}
					};
				};

				const eyeMovementCoeff = {
					x: 10,
					y: 10
				};

				const getClampedIrisOffset = (iris, range) => {
					const x = range.leftAndRightMiddle.x - iris.x;
					const y = range.topAndBottomMiddle.y - iris.y;

					return {
						x: Math.min(Math.max(x * eyeMovementCoeff.x, -0.05), 0.05),
						y: Math.min(Math.max(y * eyeMovementCoeff.y, -0.03), 0.03),
					};
				};

				const leftIris = face.landmarks[473];
				const leftEyeRange = eyeRange(362, 263);

				const leftOffset = getClampedIrisOffset(leftIris, leftEyeRange);
				leftEyeTargetPosition = new THREE.Vector3(
					leftEye.initalPosition.x + leftOffset.x,
					leftEye.initalPosition.y + leftOffset.y,
					leftEye.initalPosition.z
				);

				const rightIris = face.landmarks[468];
				const rightEyeRange = eyeRange(133, 33);

				const rightOffset = getClampedIrisOffset(rightIris, rightEyeRange);
				rightEyeTargetPosition = new THREE.Vector3(
					rightEye.initalPosition.x + rightOffset.x,
					rightEye.initalPosition.y + rightOffset.y,
					rightEye.initalPosition.z
				);

				/* ctx2D.fillStyle = "lime";
				for (const landmark of [
					{ x: leftEyeRange.leftAndRightMiddle.x, y: leftEyeRange.topAndBottomMiddle.y },
					leftEyeRange.top, leftEyeRange.left, leftEyeRange.bottom, leftEyeRange.right,
		
					{ x: rightEyeRange.leftAndRightMiddle.x, y: rightEyeRange.topAndBottomMiddle.y },
					rightEyeRange.top, rightEyeRange.left, rightEyeRange.bottom, rightEyeRange.right,
				]) {
					const x = canvas2D.width - (landmark.x * canvas2D.width);
					const y = landmark.y * canvas2D.height;
					ctx2D.fillRect(x - 0.5 * scale, y - 0.5 * scale, 0.5 * scale, 0.5 * scale);
				} */
			};

			if (face.blendShapes?.categories) {
				const blinkLeft = face.blendShapes.categories[9].score;
				const blinkRight = face.blendShapes.categories[10].score;
				const smile = (face.blendShapes.categories[44].score + face.blendShapes.categories[45].score) / 2;
				// const browDown = (face.blendShapes.categories[1].score + face.blendShapes.categories[2].score) / 2;
				// const browUp = face.blendShapes.categories[3].score;

				const isBlinking = blinkLeft > 0.35 || blinkRight > 0.35;
				const isSmiling = !isBlinking && smile > 0.3;
				// const isSurprised = !isBlinking && !isSmiling && browUp > 0.1;
				// const isAngry = !isBlinking && !isSmiling && browDown > 0.4;
				// const isPerplex = !isBlinking && !isSmiling && !isAngry && browDown > 0.15;

				const emotion = isSmiling ? 2 : 0;
				const targetEye = isBlinking ? 1 : emotion;

				if (leftEye.currentEye != targetEye) {
					leftEye.currentEye = targetEye;
					leftEye.material = eyeMaterials[targetEye];
				}

				if (rightEye.currentEye != targetEye) {
					rightEye.currentEye = targetEye;
					rightEye.material = eyeMaterials[targetEye];
				}
			}

			if (face.matrix?.data) {
				const m = face.matrix.data;
				headTargetPosition = new THREE.Vector3(
					Math.min(Math.max(-m[12], -15), 15) / 15,
					Math.min(Math.max(m[13], -12), 12) / 25,
					Math.min((m[14] + 45) / 15, 0.5)
				);

				const headTargetRotation = new THREE.Euler(
					-Math.atan2(m[9], m[10]) + 0.2,
					Math.atan2(-m[8], Math.sqrt(m[9] * m[9] + m[10] * m[10])),
					Math.atan2(m[4], m[0])
				);
				headTargetQuaternion = new THREE.Quaternion().setFromEuler(headTargetRotation);
			}
		}

		ctx2D.fillStyle = "white";
		ctx2D.font = `${4 * scale}px Arial`;
		ctx2D.fillText(log.join(" · "), 0, 5 * scale);
	}

	const eyeBaseCoeff = 0.1;
	const headPositionBaseCoeff = 0.05;
	const headQuaternionBaseCoeff = 0.15;

	const eyeLerpAlpha = 1 - Math.pow(1 - eyeBaseCoeff, delta * 60);
	const headPositionLerpAlpha = 1 - Math.pow(1 - headPositionBaseCoeff, delta * 60);
	const headQuaternionLerpAlpha = 1 - Math.pow(1 - headQuaternionBaseCoeff, delta * 60);

	if (leftEyeTargetPosition) leftEye.position.lerp(leftEyeTargetPosition, eyeLerpAlpha);
	if (rightEyeTargetPosition) rightEye.position.lerp(rightEyeTargetPosition, eyeLerpAlpha);
	if (headTargetPosition) head.position.lerp(headTargetPosition, headPositionLerpAlpha);
	if (headTargetQuaternion) head.quaternion.slerp(headTargetQuaternion, headQuaternionLerpAlpha);

	renderer.render(scene, camera);

	requestAnimationFrame(loop);
};

addEventListener("DOMContentLoaded", async () => {
	await initCanvas();
	await initModels();
	initEncoder();
	await connect();
	loop();
});