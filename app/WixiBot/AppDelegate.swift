import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
	var statusItem: NSStatusItem!
    var backgroundTaskProcess: Process?
    var backgroundTaskPID: Int32?

	func applicationDidFinishLaunching(_ notification: Notification) {
		statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

		if let button = statusItem.button {
			button.image = NSImage(systemSymbolName: "terminal.fill", accessibilityDescription: "Launcher")
		}

		let menu = NSMenu()
		menu.addItem(NSMenuItem(title: "Quit", action: #selector(terminate), keyEquivalent: "q"))
		statusItem.menu = menu

		runZshScript()
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
