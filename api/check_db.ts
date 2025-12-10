
import { supabase } from "./lib/supabase.js";

async function checkSchema() {
    console.log("Checking public.users schema...");

    // Try to insert/select to test columns
    // We can't easily "describe table" via JS client without SQL function
    // But we can try detailed inspection if possible.

    // Alternative: Try to select the NEW columns for a made-up user
    const { data, error } = await supabase
        .from('users')
        .select('id, email, firstname, lastname')
        .limit(1);

    if (error) {
        console.error("Error selecting columns:", error);
        if (error.code === '42703') {
            console.log("\n!!! CRITICAL ERROR: Database columns are missing !!!");
            console.log("You MUST run the migration SQL script.");
        }
    } else {
        console.log("✅ Columns exist. Schema looks good.");
        console.log("Sample data:", data);
    }
}

checkSchema().catch(console.error);
