import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function zodErrorResponse(error: ZodError): NextResponse {
  const message = error.errors.map((issue) => issue.message).join("; ");
  return jsonError(message, 400);
}

export function notFound(message = "Not found"): NextResponse {
  return jsonError(message, 404);
}
