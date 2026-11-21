import { describe, expect, it } from "vitest"
import { parsePhotoImagePath, photoImageUrl } from "./photo-image"

const ID = "e87c768f-253c-4598-8c42-8e3da4eb551e"

describe("photoImageUrl", () => {
  it("maps a storage path to the first-party image route", () => {
    expect(photoImageUrl(`photos/${ID}/full.jpg`)).toBe(`/api/images/photos/${ID}/full.jpg`)
  })

  it("encodes every path segment", () => {
    expect(photoImageUrl("photos/a b/full.jpg")).toBe("/api/images/photos/a%20b/full.jpg")
  })
})

describe("parsePhotoImagePath", () => {
  it("accepts the three known variants", () => {
    for (const variant of ["thumb.jpg", "full.jpg"]) {
      expect(parsePhotoImagePath(["photos", ID, variant])).toBe(`photos/${ID}/${variant}`)
    }
  })

  it("rejects anything outside photos/<uuid>/{thumb,web,full}.jpg", () => {
    expect(parsePhotoImagePath(["photos", ID])).toBeNull()
    expect(parsePhotoImagePath(["photos", ID, "full.jpg", "extra"])).toBeNull()
    expect(parsePhotoImagePath(["secrets", ID, "full.jpg"])).toBeNull()
    expect(parsePhotoImagePath(["photos", "..", "full.jpg"])).toBeNull()
    expect(parsePhotoImagePath(["photos", ID, "thumb.png"])).toBeNull()
    expect(parsePhotoImagePath(["photos", `${ID}/../../x`, "full.jpg"])).toBeNull()
  })
})
