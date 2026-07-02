import process from "node:process";

function updateCursorPosition(row: number, col: number) {
  // \x1B[ is the Control Sequence Introducer (CSI)
  // \x1B[${row};${col}H moves the cursor to absolute position
  process.stdin.write(`\x1B[${row};${col}H`);
}

function main() {
  let row = 1;
  let col = 1;
  // This will check if stdin is actual terminal (TTY)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    // it will resume the stdin to start reading
    process.stdin.resume();

    process.stdin.setEncoding("utf8");
  }

  console.log("Raw mode Enabled. Type anything! Press 'q' to exit.");
  console.clear();

  updateCursorPosition(row, col);

  process.stdin.on("data", (key: string) => {
    if (key === `q` || key === "\u0003") {
      // \u0003 is hex value for Ctrl+c
      console.log("Exiting raw mode");

      process.stdin.setRawMode(false);
      process.exit(0);
    }

    // Handling the Arrow keys
    // In raw mode Arrow keys sent as 3-bytes escape sequece
    // Up: \x1b[A
    // Down: \x1b[B
    // Right: \x1b[C
    // Left: \x1b[D
    if (key === "\x1B[A" || key === "k") row = Math.max(1, row - 1);
    if (key === "\x1B[B" || key === "j") row++;
    if (key === "\x1B[C" || key === "l") col++;
    if (key === "\x1B[D" || key === "h") col = Math.max(1, col - 1);

    // console.log(`Received key: ${JSON.stringify(key)}`);
    updateCursorPosition(row, col);
  });
}

main();
