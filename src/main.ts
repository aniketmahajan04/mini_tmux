import process from "node:process";

function updateCursorPosition(row: number, col: number) {
  // \x1B[ is the Control Sequence Introducer (CSI)
  // \x1B[${row};${col}H moves the cursor to absolute position
  process.stdin.write(`\x1B[${row};${col}H`);
}

function main() {
  let row = 1;
  let col = 1;
  let inputBuffer = "";
  // This will check if stdin is actual terminal (TTY)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    // it will resume the stdin to start reading
    process.stdin.resume();

    process.stdin.setEncoding("utf8");
  }

  // console.clear();
  console.log("Raw mode Enabled. Type anything! Press 'q' to exit.");

  updateCursorPosition(row, col);

  process.stdin.on("data", (key: string) => {
    if (key === `q` || key === "\u0003") {
      // \u0003 is hex value for Ctrl+c
      console.log("Exiting raw mode");

      process.stdin.setRawMode(false);
      process.exit(0);
    }

    // This handle Enter key to execute commands
    if (key === "\r" || key === "\n") {
      const command = inputBuffer.trim().toLowerCase();

      if (command === "clear") {
        process.stdin.write("\x1b[2J\x1b[H");
      } else {
        process.stdin.write("\nUndefined command!\n");
        inputBuffer = "";
      }
    }

    // This handles the backspace to modify the inputBuffer written
    if (key === "\x7F" || key === "\b") {
      if (inputBuffer.length > 0) {
        inputBuffer = inputBuffer.slice(0, -1);

        process.stdin.write("\b \b");
      }
      return;
    }

    // Handling the Arrow keys
    // In raw mode Arrow keys sent as 3-bytes escape sequece
    // Up: \x1b[A
    // Down: \x1b[B
    // Right: \x1b[C
    // Left: \x1b[D
    if (
      ["\x1B[A", "\x1B[B", "\x1B[C", "\x1B[D"].includes(key) &&
      inputBuffer.length === 0
    ) {
      if (key === "\x1B[A") row = Math.max(1, row - 1);
      if (key === "\x1B[B") row++;
      if (key === "\x1B[C") col++;
      if (key === "\x1B[D") col = Math.max(1, col - 1);

      updateCursorPosition(row, col);

      return;
    }

    // console.log(`Received key: ${JSON.stringify(key)}`);
    // This will avoid escape codes and arrow key to print and only accept standard printable characters
    if (
      key.length === 1 &&
      key.charCodeAt(0) >= 32 &&
      key.charCodeAt(0) <= 162
    ) {
      inputBuffer += key;
      process.stdin.write(key);
    }
  });
}

main();
