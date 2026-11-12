"use client";
import { useParams } from "next/navigation";
import { Workspace } from "@/components/workspace";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace id={id} />;
}
