"use client";
import Modal from "@/components/ui/Modal";
import CaseForm from "../caseform";
import { useRouter } from "next/navigation";

export default function ManualCreatePage() {
  const router = useRouter();
  return (
    <Modal onClose={() => router.push("/cases")}>
      <CaseForm onClose={() => router.push("/cases")} />
    </Modal>
  );
}
