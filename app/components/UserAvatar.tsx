"use client"

import { useState } from "react"

export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
}: {
  name?: string
  avatarUrl?: string
  size?: number
}) {
  const [error, setError] = useState(false)

  const initial = name?.charAt(0).toUpperCase() || "U"

  if (avatarUrl && !error) {
    return (
      <img
        src={avatarUrl}
        onError={() => setError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#4f46e5",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
      }}
    >
      {initial}
    </div>
  )
}