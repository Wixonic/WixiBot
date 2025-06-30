import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
	var statusItem: NSStatusItem!
    var backgroundTaskProcess: Process?
    var backgroundTaskPID: Int32?

    var microphoneEnabled: Bool = true
	var microphoneMenuItem: NSMenuItem!

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

		menu.addItem(NSMenuItem(title: "Quit", action: #selector(terminate), keyEquivalent: "q"))
		statusItem.menu = menu

		runZshScript()
	}

    @objc func toggleMicrophone(_ sender: NSMenuItem) {
		microphoneEnabled.toggle()
		microphoneMenuItem.state = microphoneEnabled ? .on : .off
		sendToggleRequest(id: "microphone", status: microphoneEnabled)
	}

    func sendToggleRequest(id: String, status: Bool) {
        guard let url = URL(string: "https://server.wixonic.fr/obs/settings/?id=\(id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Bool] = ["status": status]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error sending toggle request for \(id):", error)
            } else {
                print("Sent toggle request for \(id) with status: \(status)")
            }
        }
        task.resume()
    }

	@objc func terminate() {
        if let pid = backgroundTaskPID {
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
        let shellCommand = """
        source ~/.zprofile
        cd ~/Documents/GitHub/WixiBot/src
        mkdir -p ~/WixiBot/logs/
        touch ~/WixiBot/logs/server.log
        nohup npm run start >> ~/WixiBot/logs/server.log 2>&1 &
        echo $! # Output the PID of the background process
        """

        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/zsh")
        task.arguments = ["-c", shellCommand]
        task.currentDirectoryURL = URL(fileURLWithPath: "/Users/\(NSUserName())")

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe

        do {
            try task.run()
        } catch {
            print("Failed to run background script:", error)
            return
        }

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        if let pidString = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
           let pid = Int32(pidString) {
            print("Started background process with PID: \(pid)")
            backgroundTaskPID = pid
        } else {
            print("Could not obtain PID of background process.")
        }
        backgroundTaskProcess = task
	}

	func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
		return false
	}
}
