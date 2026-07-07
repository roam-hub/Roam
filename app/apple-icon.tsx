import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#ff6a5a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 110,
            fontWeight: 800,
            fontFamily: "serif",
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          R
        </span>
      </div>
    ),
    { ...size }
  );
}
