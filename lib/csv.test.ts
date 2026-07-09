import { describe, expect, it } from "vitest";
import { arrayToCsv, escapeCsvCell, toCsvRow, withBom } from "@/lib/csv";

describe("escapeCsvCell", () => {
    it("passes through plain values", () => {
        expect(escapeCsvCell("beef")).toBe("beef");
        expect(escapeCsvCell(42)).toBe("42");
        expect(escapeCsvCell(0)).toBe("0");
    });

    it("renders null/undefined as empty", () => {
        expect(escapeCsvCell(null)).toBe("");
        expect(escapeCsvCell(undefined)).toBe("");
    });

    it("quotes fields containing commas, quotes, or newlines", () => {
        expect(escapeCsvCell("Lagos, NG")).toBe('"Lagos, NG"');
        expect(escapeCsvCell('he said "hi"')).toBe('"he said ""hi"""');
        expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    });
});

describe("toCsvRow / arrayToCsv", () => {
    it("joins cells and escapes each", () => {
        expect(toCsvRow(["a", "b,c", 3])).toBe('a,"b,c",3');
    });

    it("builds header + rows with CRLF line endings", () => {
        const csv = arrayToCsv(["Name", "Qty"], [["Beef", 2], ["Goat, 1kg", 3]]);
        expect(csv).toBe('Name,Qty\r\nBeef,2\r\n"Goat, 1kg",3');
    });
});

describe("withBom", () => {
    it("prepends the UTF-8 BOM", () => {
        expect(withBom("a,b").charCodeAt(0)).toBe(0xfeff);
    });
});
