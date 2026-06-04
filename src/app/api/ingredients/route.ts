import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("photos")
      .select("ingredients")
      .not("ingredients", "eq", "{}")
      .limit(1000)

    if (error) {
      console.error("Ingredients fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 })
    }

    const unique = new Set<string>()
    for (const row of data ?? []) {
      if (Array.isArray(row.ingredients)) {
        for (const ing of row.ingredients) {
          if (typeof ing === "string" && ing.trim()) {
            unique.add(ing.trim())
          }
        }
      }
    }

    const ingredients = Array.from(unique).sort()

    return NextResponse.json(
      { ingredients },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("Ingredients error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
