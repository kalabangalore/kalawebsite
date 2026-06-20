// Local development entry point. On Vercel the same app is served
// through api/[...path].js as a serverless function instead.
import app from "./app.js";

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✓ KALA API listening on http://localhost:${PORT}`));
