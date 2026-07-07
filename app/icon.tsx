import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#ff6a5a",
          borderRadius: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 96,
        }}
      >
        ✈
      </div>
    ),
    { ...size }
  );
}
