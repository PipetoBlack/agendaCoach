"use client"
import { useState } from "react";
import EvaluationFormDialog from "@/components/evaluation-form-dialog";
import { Button } from "@/components/ui/button";

export default function EvaluacionPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Button onClick={() => setOpen(true)} className="mb-6">Crear evaluación</Button>
      <EvaluationFormDialog open={open} onClose={() => setOpen(false)} />
      {/* Aquí se puede mostrar historial de evaluaciones en el futuro */}
    </div>
  );
}
