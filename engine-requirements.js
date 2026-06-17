const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 20) {
  console.error(
    `\n❌ This package requires Node.js 20+ to run reliably.\n` +
    `   You are using Node.js ${process.versions.node}.\n` +
    `   Please upgrade to Node.js 20+ to proceed.\n`
  );
  process.exit(1);
}

// Node 23+ compatibility notice
if (major >= 23) {
  // Node 23+ fully supported - no action needed
}
