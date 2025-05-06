const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "configurations.db"));

db.all("SELECT * FROM configurations", (err, rows) => {
  if (err) throw err;
  let updated = 0;
  rows.forEach((row) => {
    if (!row.parameterOrder) {
      let order = [];
      try {
        const exposed = JSON.parse(row.exposedParameters || "{}");
        // exposedParameters is { [nodeId]: string[] }
        if (typeof exposed === "object" && !Array.isArray(exposed)) {
          Object.entries(exposed).forEach(([nodeId, params]) => {
            (params || []).forEach((param) => order.push(`${nodeId}.${param}`));
          });
        }
      } catch (e) {}
      db.run(
        "UPDATE configurations SET parameterOrder = ? WHERE id = ?",
        [JSON.stringify(order), row.id],
        function (err) {
          if (!err) updated++;
        }
      );
    }
  });
  setTimeout(() => {
    console.log(`Migration complete. Updated ${updated} configurations.`);
    db.close();
  }, 1000);
});
