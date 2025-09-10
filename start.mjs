// Production-safe server entry point
import("./server/index.js").catch(async (err) => {
  console.error("Failed to import compiled server, trying TypeScript:", err.message);
  try {
    // Fallback to tsx for TypeScript execution
    const { register } = await import("tsx/esm");
    register();
    await import("./server/index.ts");
  } catch (tsErr) {
    console.error("Failed to start server:", tsErr);
    process.exit(1);
  }
});
