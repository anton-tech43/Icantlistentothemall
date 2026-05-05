import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "icantlistentothemall";
  const subtitle = searchParams.get("subtitle") || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          fontFamily: "monospace",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 36,
            color: "#000000",
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: "900px",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 20,
              color: "#666666",
              textAlign: "center",
              marginTop: "24px",
            }}
          >
            {subtitle}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            fontSize: 16,
            color: "#666666",
          }}
        >
          icantlistentothemall
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
