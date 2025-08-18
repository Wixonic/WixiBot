import Cocoa

class InsecureDelegate: NSObject, URLSessionDelegate {
	func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
		completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))
	}
}

@main
class AppDelegate: NSObject, NSApplicationDelegate {
	var statusItem: NSStatusItem!
    var backgroundTaskProcess: Process?
    var backgroundTaskPID: Int32?

    var microphoneEnabled: Bool = false
	var audioEnabled: Bool = false
	var broadcastEnabled: Bool = false

	var microphoneMenuItem: NSMenuItem!
	var audioMenuItem: NSMenuItem!
    var broadcastMenuItem: NSMenuItem!

	func applicationDidFinishLaunching(_ notification: Notification) {
		statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

		if let button = statusItem.button {
			button.image = NSImage(systemSymbolName: "terminal.fill", accessibilityDescription: "Launcher")
		}

		let menu = NSMenu()

        microphoneMenuItem = NSMenuItem(title: "Microphone", action: #selector(toggleMicrophone(_:)), keyEquivalent: "m")
		microphoneMenuItem.state = microphoneEnabled ? .on : .off
		microphoneMenuItem.target = self
		menu.addItem(microphoneMenuItem)

		audioMenuItem = NSMenuItem(title: "Audio", action: #selector(toggleAudio(_:)), keyEquivalent: "a")
		audioMenuItem.state = audioEnabled ? .on : .off
		audioMenuItem.target = self
		menu.addItem(audioMenuItem)

		broadcastMenuItem = NSMenuItem(title: "Broadcast", action: #selector(toggleBroadcast(_:)), keyEquivalent: "b")
		broadcastMenuItem.state = broadcastEnabled ? .on : .off
		broadcastMenuItem.target = self
		menu.addItem(broadcastMenuItem)

		menu.addItem(NSMenuItem(title: "Quit", action: #selector(terminate), keyEquivalent: "q"))
		statusItem.menu = menu

		runZshScript()
	}

    @objc func toggleMicrophone(_ sender: NSMenuItem) {
		microphoneEnabled.toggle()
		microphoneMenuItem.state = microphoneEnabled ? .on : .off
		sendToggleRequest(id: "microphone", status: microphoneEnabled)
	}

	@objc func toggleAudio(_ sender: NSMenuItem) {
		audioEnabled.toggle()
		audioMenuItem.state = audioEnabled ? .on : .off
		sendToggleRequest(id: "audio", status: audioEnabled)
	}

	@objc func toggleBroadcast(_ sender: NSMenuItem) {
		broadcastEnabled.toggle()
		broadcastMenuItem.state = broadcastEnabled ? .on : .off
		sendToggleRequest(id: "broadcast", status: broadcastEnabled)
	}

    func sendToggleRequest(id: String, status: Bool) {
		guard let url = URL(string: "https://server.wixonic.fr/obs/settings/?id=\(id)") else { return }
		
		var request = URLRequest(url: url)
		request.httpMethod = "POST"

		if let url = Bundle.main.url(forResource: "secrets", withExtension: "json"),
		   let data = try? Data(contentsOf: url),
		   let secrets = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
		   let wixKey = secrets["wixkey"] as? String {
			request.setValue("WixKey \(wixKey)", forHTTPHeaderField: "Authorization")
			print("Sending toggle request for \(id) with WixKey \(wixKey)")
		} else {
			print("Sending toggle request for \(id) without WixKey")
		}

		request.setValue("application/json", forHTTPHeaderField: "Content-Type")
		
		let body: [String: Bool] = ["status": status]
		request.httpBody = try? JSONSerialization.data(withJSONObject: body)

		let session = URLSession(
			configuration: .default,
			delegate: InsecureDelegate(),
			delegateQueue: nil
		)

		let task = session.dataTask(with: request) { data, response, error in
			if let error = error {
				print("Error sending toggle request for \(id):", error)
			} else {
				print("Sent toggle request for \(id) with status: \(status)")
			}
		}
		task.resume()
    }

	@objc func terminate() {
		if let task = backgroundTaskProcess {
			task.terminate()
			print("Terminated npm process with PID: \(task.processIdentifier)")
		} else if let pid = backgroundTaskPID {
			let killTask = Process()
			killTask.executableURL = URL(fileURLWithPath: "/bin/kill")
			killTask.arguments = ["-9", String(pid)]
			
			do {
				try killTask.run()
				killTask.waitUntilExit()
				print("Killed background process with PID: \(pid)")
			} catch {
				print("Failed to terminate background process:", error)
			}
		}

		NSApp.terminate(nil)
	}

	func runZshScript() {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/opt/homebrew/bin/npm")
        task.arguments = ["run", "start"]
        task.currentDirectoryURL = URL(fileURLWithPath: "/Users/\(NSUserName())/Documents/GitHub/WixiBot/src")

        var currentEnv = ProcessInfo.processInfo.environment
        let customPaths = "/usr/local/ffmpeg-4.1/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/Library/Apple/usr/bin"

        if let userPath = currentEnv["PATH"] {
            currentEnv["PATH"] = userPath + ":" + customPaths
        }

        task.environment = currentEnv

        let logURL = URL(fileURLWithPath: "/Users/\(NSUserName())/WixiBot/logs/server.log")
        FileManager.default.createFile(atPath: logURL.path, contents: nil, attributes: nil)

        if let fileHandle = try? FileHandle(forWritingTo: logURL) {
            task.standardOutput = fileHandle
            task.standardError = fileHandle
        }
		
        do {
            try task.run()
            backgroundTaskPID = task.processIdentifier
            backgroundTaskProcess = task
            print("Started npm run start with PID: \(task.processIdentifier)")
        } catch {
            print("Failed to run npm:", error)
        }
    }

	func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
		return false
	}
}
