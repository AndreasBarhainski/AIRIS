const { Pool } = require("pg");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

(async () => {
  try {
    const res = await pool.query("SELECT * FROM configurations");
    let updated = 0;
    for (const row of res.rows) {
      if (!row.parameterOrder) {
        let order = [];
        try {
          const exposed = JSON.parse(row.exposedParameters || "{}");
          // exposedParameters is { [nodeId]: string[] }
          if (typeof exposed === "object" && !Array.isArray(exposed)) {
            Object.entries(exposed).forEach(([nodeId, params]) => {
              (params || []).forEach((param) =>
                order.push(`${nodeId}.${param}`)
              );
            });
          }
        } catch (e) {}
        await pool.query(
          "UPDATE configurations SET parameterOrder = $1 WHERE id = $2",
          [JSON.stringify(order), row.id]
        );
        updated++;
      }
    }
    await pool.end();
    console.log(`Migration complete. Updated ${updated} configurations.`);
  } catch (err) {
    console.error("Migration failed:", err);
  }
})();
