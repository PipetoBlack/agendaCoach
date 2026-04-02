import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getEvaluationDateInputValue,
  getTodayEvaluationDateInputValue,
  isValidEvaluationDateInput,
  serializeEvaluationDate,
} from '@/lib/evaluation-date'

type ClienteMin = {
  id: string
  nombre_completo?: string
  fecha_nacimiento?: string | null
  genero?: string | null
}

export default function EvaluationFormDialog({ open, onClose, onSaved, evaluation }: { open: boolean; onClose: () => void; onSaved?: () => void; evaluation?: any }) {
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState<ClienteMin[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [patologias, setPatologias] = useState("");
  const [tienePatologias, setTienePatologias] = useState(false);
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [porcentajeGrasa, setPorcentajeGrasa] = useState("");
  const [tipoMedicion, setTipoMedicion] = useState("");
  const [pliegues, setPliegues] = useState({
    bicipital: "",
    tricipital: "",
    subescapular: "",
    suprailiaco: "",
  });
  const [agregarPerimetros, setAgregarPerimetros] = useState(false);
  const [cintura, setCintura] = useState("");
  const [cadera, setCadera] = useState("");
  const [meta, setMeta] = useState("");
  const [fechaEvaluacion, setFechaEvaluacion] = useState<string>(() => {
    return getTodayEvaluationDateInputValue()
  })
  // InBody-specific fields
  const [masaMuscular, setMasaMuscular] = useState("");
  const [masaGrasaKg, setMasaGrasaKg] = useState("");
  const [aguaCorporalKg, setAguaCorporalKg] = useState("");
  const [grasaVisceral, setGrasaVisceral] = useState("");
  const [masaMuscularAuto, setMasaMuscularAuto] = useState(true);
  const [masaGrasaAuto, setMasaGrasaAuto] = useState(true);
  const [dirtyFields, setDirtyFields] = useState<Record<string, boolean>>({})
  const isEditing = !!evaluation
  const [resultados, setResultados] = useState<any | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [caliperInfo, setCaliperInfo] = useState<any | null>(null)
  const computeAge = (fecha?: string | null) => {
    if (!fecha) return '—'
    const born = new Date(fecha)
    if (isNaN(born.getTime())) return '—'
    const years = Math.floor((Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    return String(years)
  }

  // Devuelve edad numérica en años o null
  function computeAgeYears(fecha?: string | null) {
    if (!fecha) return null
    const born = new Date(fecha)
    if (isNaN(born.getTime())) return null
    return Math.floor((Date.now() - born.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  function normalizeGender(g?: string | null) {
    if (!g) return null
    const s = g.toString().toLowerCase()
    if (s.startsWith('m') || s.includes('masc') || s === 'male') return 'male'
    if (s.startsWith('f') || s.includes('fem') || s === 'female') return 'female'
    return null
  }

  // Devuelve constantes a,b para Durnin & Womersley según sexo y grupo de edad
  function getDurninConstants(age: number | null, gender: 'male' | 'female' | null) {
    if (!age || !gender) return null
    // Valores basados en tablas Durnin & Womersley por grupos de edad (aprox.)
    const groups = [
      { min: 17, max: 19 },
      { min: 20, max: 29 },
      { min: 30, max: 39 },
      { min: 40, max: 49 },
      { min: 50, max: 59 },
      { min: 60, max: 120 },
    ]

    const maleCoeffs = [
      { a: 1.1620, b: 0.0630 },
      { a: 1.1631, b: 0.0632 },
      { a: 1.1422, b: 0.0544 },
      { a: 1.1620, b: 0.0700 },
      { a: 1.1715, b: 0.0779 },
      { a: 1.1715, b: 0.0779 },
    ]

    const femaleCoeffs = [
      { a: 1.1549, b: 0.0678 },
      { a: 1.1599, b: 0.0717 },
      { a: 1.1423, b: 0.0632 },
      { a: 1.1333, b: 0.0612 },
      { a: 1.1339, b: 0.0645 },
      { a: 1.1339, b: 0.0645 },
    ]

    for (let i = 0; i < groups.length; i++) {
      if (age >= groups[i].min && age <= groups[i].max) {
        return gender === 'male' ? maleCoeffs[i] : femaleCoeffs[i]
      }
    }
    return null
  }

  function calculateCaliperPercentage(sumPliegues: number) {
    if (!sumPliegues || sumPliegues <= 0) return { percent: null, info: { method: 'invalid', sum: sumPliegues } }
    // intenta usar Durnin & Womersley cuando exista cliente seleccionado con edad y genero
    const sel = clientes.find((c) => c.id === clienteId)
    const age = sel?.fecha_nacimiento ? computeAgeYears(sel.fecha_nacimiento) : null
    const gender = normalizeGender(sel?.genero ?? null)

    const coeff = getDurninConstants(age, gender)
    if (coeff) {
      // densidad corporal por Durnin & Womersley
      const dens = coeff.a - coeff.b * Math.log10(sumPliegues)
      if (dens && isFinite(dens) && dens > 0) {
        const fat = (495 / dens) - 450
        return { percent: Math.round(fat * 10) / 10, info: { method: 'Durnin & Womersley', dens: Math.round(dens * 1000) / 1000, a: coeff.a, b: coeff.b, age, gender, sum: sumPliegues } }
      }
    }

    // Fallback genérico (valor orientativo, mantengo la aproximación previa)
    const fallback = Math.round((sumPliegues * 0.153 + 5.783) * 10) / 10
    return { percent: fallback, info: { method: 'Estimación genérica', sum: sumPliegues } }
  }

  // Categoría de IMC según clasificaciones estándar (en español)
  function getBMICategory(bmi?: number | null) {
    if (bmi === null || bmi === undefined || isNaN(Number(bmi))) return null
    const v = Number(bmi)
    if (v < 18.5) return 'Bajo peso'
    if (v < 25) return 'Normal'
    if (v < 30) return 'Sobrepeso'
    if (v < 35) return 'Obesidad I'
    if (v < 40) return 'Obesidad II'
    return 'Obesidad III'
  }

  function calcularResultados() {
    const errores: string[] = [];
    // Validaciones básicas
    if (!clienteId) errores.push("Selecciona un cliente");
    // Fecha obligatoria
    if (!isValidEvaluationDateInput(fechaEvaluacion)) errores.push("Fecha inválida");
    if (!objetivo) errores.push("El objetivo es obligatorio");
    if (!peso || isNaN(Number(peso)) || Number(peso) <= 0) errores.push("Peso inválido");
    if (!estatura || isNaN(Number(estatura)) || Number(estatura) <= 0) errores.push("Estatura inválida");
    // % Grasa obligatorio salvo que se use Caliper (se calcula desde pliegues)
    if (tipoMedicion !== 'Caliper') {
      if (!porcentajeGrasa || isNaN(Number(porcentajeGrasa)) || Number(porcentajeGrasa) < 0 || Number(porcentajeGrasa) > 100) {
        errores.push("% Grasa inválido");
      }
    } else {
      // si es Caliper, validar pliegues
      const plieguesVals = Object.values(pliegues).map(Number);
      if (plieguesVals.some((v) => isNaN(v) || v <= 0)) errores.push("Todos los pliegues deben ser mayores a 0");
    }
    if (agregarPerimetros) {
      if (!cintura || isNaN(Number(cintura)) || Number(cintura) <= 0) errores.push("Cintura inválida");
      if (!cadera || isNaN(Number(cadera)) || Number(cadera) <= 0) errores.push("Cadera inválida");
    }
    if (meta.length > 255) errores.push("Meta demasiado larga");
    if (objetivo.length > 100) errores.push("Objetivo demasiado largo");
    if (patologias.length > 255) errores.push("Patologías demasiado largas");

    if (errores.length > 0) {
      setErrores(errores);
      setResultados(null);
      return { valid: false };
    }

    // Cálculos
    const pesoNum = Number(peso);
    const estaturaNum = Number(estatura) / 100; // a metros
    const imc = pesoNum / (estaturaNum * estaturaNum);
    let porcentajeGrasaNum = Number(porcentajeGrasa);
    if (tipoMedicion === "Caliper") {
      const sumaPliegues = Object.values(pliegues).reduce((acc, v) => acc + Number(v || 0), 0);
      const calc = calculateCaliperPercentage(sumaPliegues)
      porcentajeGrasaNum = calc?.percent ?? porcentajeGrasaNum
      setCaliperInfo(calc?.info || null)
    }
    let icc = null, ice = null;
    if (agregarPerimetros) {
      icc = Number(cintura) / Number(cadera);
      ice = Number(cintura) / Number(estatura);
    }
    const imcRounded = Math.round(imc * 10) / 10
    const categoria = getBMICategory(imcRounded)
    const resultadosLocal = {
      imc: imcRounded,
      porcentajeGrasa: porcentajeGrasaNum,
      icc: icc ? Math.round(icc * 100) / 100 : null,
      ice: ice ? Math.round(ice * 100) / 100 : null,
      categoriaImc: categoria,
    }
    setErrores([]);
    setResultados(resultadosLocal);
    return { valid: true, resultados: resultadosLocal };
  }

  function markDirty(field: string) {
    setDirtyFields((s) => ({ ...(s || {}), [field]: true }))
  }

  // when opening for edit, prefill fields from evaluation
  useEffect(() => {
    if (!open) return
    if (evaluation) {
      setClienteId(evaluation.cliente_id ?? "")
      setFechaEvaluacion(getEvaluationDateInputValue(evaluation.fecha) || getTodayEvaluationDateInputValue())
      setObjetivo(evaluation.objetivo ?? "")
      setPatologias(evaluation.patologias ?? "")
      setTienePatologias(!!evaluation.patologias)
      setPeso(evaluation.peso != null ? String(evaluation.peso) : "")
      setEstatura(evaluation.estatura != null ? String(evaluation.estatura) : "")
      setTipoMedicion(evaluation.tipo_medicion ?? "")
      setPorcentajeGrasa(evaluation.porcentaje_grasa != null ? String(evaluation.porcentaje_grasa) : "")
      setPliegues({
        bicipital: evaluation.pliegues?.bicipital != null ? String(evaluation.pliegues.bicipital) : "",
        tricipital: evaluation.pliegues?.tricipital != null ? String(evaluation.pliegues.tricipital) : "",
        subescapular: evaluation.pliegues?.subescapular != null ? String(evaluation.pliegues.subescapular) : "",
        suprailiaco: evaluation.pliegues?.suprailiaco != null ? String(evaluation.pliegues.suprailiaco) : "",
      })
      setAgregarPerimetros(!!(evaluation.cintura || evaluation.cadera))
      setCintura(evaluation.cintura != null ? String(evaluation.cintura) : "")
      setCadera(evaluation.cadera != null ? String(evaluation.cadera) : "")
      setMeta(evaluation.meta ?? "")
      setMasaMuscular(evaluation.masa_muscular != null ? String(evaluation.masa_muscular) : "")
      setMasaGrasaKg(evaluation.masa_libre_grasa != null ? String(evaluation.masa_libre_grasa) : (evaluation.masa_grasa != null ? String(evaluation.masa_grasa) : ""))
      setAguaCorporalKg(evaluation.agua_corporal != null ? String(evaluation.agua_corporal) : "")
      setGrasaVisceral(evaluation.grasa_visceral != null ? String(evaluation.grasa_visceral) : "")
      setMasaMuscularAuto(evaluation.masa_muscular == null)
      setMasaGrasaAuto((evaluation.masa_libre_grasa == null) && (evaluation.masa_grasa == null))
      setDirtyFields({})
      setErrores([])
      setResultados({
        imc: evaluation.imc ?? null,
        porcentajeGrasa: evaluation.porcentaje_grasa ?? null,
        icc: evaluation.icc ?? null,
        ice: evaluation.ice ?? null,
        categoriaImc: evaluation.categoria_imc ?? null,
      })
    } else {
      // new evaluation -> reset fields
      setClienteId("")
      setFechaEvaluacion(getTodayEvaluationDateInputValue())
      setObjetivo("")
      setPatologias("")
      setTienePatologias(false)
      setPeso("")
      setEstatura("")
      setPorcentajeGrasa("")
      setTipoMedicion("")
      setPliegues({ bicipital: "", tricipital: "", subescapular: "", suprailiaco: "" })
      setAgregarPerimetros(false)
      setCintura("")
      setCadera("")
      setMeta("")
      setMasaMuscular("")
      setMasaGrasaKg("")
      setAguaCorporalKg("")
      setGrasaVisceral("")
      setMasaMuscularAuto(true)
      setMasaGrasaAuto(true)
      setDirtyFields({})
      setErrores([])
      setResultados(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, evaluation])

  // Compute derived results without running full validation (used for live preview
  // and for auto-filling % grasa when using Caliper)
  function computeDerivedResults() {
    const pesoNum = Number(peso)
    const estaturaNum = Number(estatura) / 100

    // Requisitos mínimos para mostrar resultados
    if (!clienteId) { setResultados(null); return {} }
    if (!isValidEvaluationDateInput(fechaEvaluacion)) { setResultados(null); return {} }
    if (!objetivo) { setResultados(null); return {} }
    if (!(pesoNum > 0) || !(estaturaNum > 0)) { setResultados(null); return {} }

    let imc = null
    if (pesoNum > 0 && estaturaNum > 0) imc = Math.round((pesoNum / (estaturaNum * estaturaNum)) * 10) / 10

    let porcentajeGrasaNum: number | null = null
    if (tipoMedicion === 'Caliper') {
      const sumaPliegues = Object.values(pliegues).reduce((acc, v) => acc + Number(v || 0), 0)
      if (sumaPliegues > 0) {
        const calc = calculateCaliperPercentage(sumaPliegues)
        porcentajeGrasaNum = calc?.percent ?? null
        setPorcentajeGrasa(porcentajeGrasaNum !== null ? String(porcentajeGrasaNum) : '')
        setCaliperInfo(calc?.info || null)
      } else {
        // pliegues incompletos -> no mostrar resultados
        setResultados(null)
        return {}
      }
    } else {
      if (porcentajeGrasa && !isNaN(Number(porcentajeGrasa))) {
        porcentajeGrasaNum = Number(porcentajeGrasa)
        setCaliperInfo(null)
      } else {
        setResultados(null)
        return {}
      }
    }

    let icc = null, ice = null
    if (agregarPerimetros) {
      if (cintura && cadera) {
        const cinturaNum = Number(cintura)
        const caderaNum = Number(cadera)
        if (!isNaN(cinturaNum) && !isNaN(caderaNum) && caderaNum > 0) {
          icc = Math.round((cinturaNum / caderaNum) * 100) / 100
        }
      }
      if (cintura && estatura) {
        const cinturaNum = Number(cintura)
        const estNum = Number(estatura)
        if (!isNaN(cinturaNum) && !isNaN(estNum) && estNum > 0) {
          ice = Math.round((cinturaNum / estNum) * 100) / 100
        }
      }
    }

    const categoria = imc !== null ? getBMICategory(imc) : null
    const resultadosLocal: any = {
      ...(imc !== null ? { imc } : {}),
      ...(porcentajeGrasaNum !== null ? { porcentajeGrasa: porcentajeGrasaNum } : {}),
      ...(icc !== null ? { icc } : {}),
      ...(ice !== null ? { ice } : {}),
      ...(categoria ? { categoriaImc: categoria } : {}),
    }

    // limpiar errores de validación en vista previa en vivo
    setErrores([])
    setResultados(resultadosLocal)
    return resultadosLocal
  }

  // When pliegues change and tipoMedicion is Caliper, auto-calc % grasa and derived results
  useEffect(() => {
    if (tipoMedicion === 'Caliper') {
      computeDerivedResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pliegues.bicipital, pliegues.tricipital, pliegues.subescapular, pliegues.suprailiaco, tipoMedicion, peso, estatura, cintura, cadera, agregarPerimetros, clienteId, fechaEvaluacion, objetivo])

  // Update derived results for live preview when inputs change
  useEffect(() => {
    computeDerivedResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peso, estatura, porcentajeGrasa, tipoMedicion, agregarPerimetros, cintura, cadera, clienteId, fechaEvaluacion, objetivo])

  // Nota: se ha eliminado el autocompletado automático de
  // masa libre de grasa (campo `masa_libre_grasa`) y masa muscular para requerir ingreso manual.

  useEffect(() => {
    let mounted = true
    async function loadClients() {
      setLoadingClientes(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (mounted) setErrores(["Usuario no autenticado"])
          return
        }
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre_completo, fecha_nacimiento, genero')
          .eq('usuario_id', user.id)
          .order('nombre_completo')

        if (error) {
          if (mounted) setErrores([error.message])
        } else {
          if (mounted) setClientes(data || [])
        }
      } catch (err) {
        if (mounted) setErrores([err instanceof Error ? err.message : 'Error cargando clientes'])
      } finally {
        if (mounted) setLoadingClientes(false)
      }
    }
    loadClients()
    return () => { mounted = false }
  }, [])

  async function handleGuardar() {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrores(["Usuario no autenticado"])
        setIsSaving(false)
        return
      }

      if (isEditing && evaluation) {
        // Build partial payload only with fields the user modified (dirtyFields)
        const payload: any = {}
        if (dirtyFields['cliente_id']) payload.cliente_id = clienteId || null
        if (dirtyFields['fecha']) payload.fecha = serializeEvaluationDate(fechaEvaluacion)
        if (dirtyFields['objetivo']) payload.objetivo = objetivo || null
        if (dirtyFields['patologias']) payload.patologias = patologias || null
        if (dirtyFields['peso']) payload.peso = peso ? Number(peso) : null
        if (dirtyFields['estatura']) payload.estatura = estatura ? Number(estatura) : null
        if (dirtyFields['tipo_medicion']) payload.tipo_medicion = tipoMedicion || null
        if (dirtyFields['porcentaje_grasa']) payload.porcentaje_grasa = porcentajeGrasa ? Number(porcentajeGrasa) : null
        if (dirtyFields['pliegues']) payload.pliegues = pliegues
        if (dirtyFields['masa_muscular']) payload.masa_muscular = masaMuscular ? Number(masaMuscular) : null
        if (dirtyFields['masa_grasa']) payload.masa_libre_grasa = masaGrasaKg ? Number(masaGrasaKg) : null
        if (dirtyFields['agua_corporal']) payload.agua_corporal = aguaCorporalKg ? Number(aguaCorporalKg) : null
        if (dirtyFields['grasa_visceral']) payload.grasa_visceral = grasaVisceral ? Number(grasaVisceral) : null
        if (dirtyFields['cintura']) payload.cintura = cintura ? Number(cintura) : null
        if (dirtyFields['cadera']) payload.cadera = cadera ? Number(cadera) : null
        if (dirtyFields['meta']) payload.meta = meta || null

        // Derived values
        if (dirtyFields['peso'] || dirtyFields['estatura']) {
          const pesoNum = Number(peso)
          const estNum = Number(estatura) / 100
          if (!isNaN(pesoNum) && !isNaN(estNum) && estNum > 0) {
            const imcVal = Math.round((pesoNum / (estNum * estNum)) * 10) / 10
            payload.imc = imcVal
            payload.categoria_imc = getBMICategory(imcVal)
          }
        }

        if (dirtyFields['pliegues'] && tipoMedicion === 'Caliper') {
          const sumaPliegues = Object.values(pliegues).reduce((acc, v) => acc + Number(v || 0), 0)
          const calc = calculateCaliperPercentage(sumaPliegues)
          payload.porcentaje_grasa = calc.percent ?? payload.porcentaje_grasa ?? null
        }

        // No se realiza autocompletado de masa al guardar en edición;
        // los campos `masa_muscular` y `masa_libre_grasa` deben ingresarse manualmente.

        // Recompute icc/ice if perimeters or estatura changed
        if (dirtyFields['cintura'] || dirtyFields['cadera'] || dirtyFields['estatura']) {
          const cinturaNum = Number(cintura)
          const caderaNum = Number(cadera)
          const estNum = Number(estatura)
          if (!isNaN(cinturaNum) && !isNaN(caderaNum) && caderaNum > 0) payload.icc = Math.round((cinturaNum / caderaNum) * 100) / 100
          if (!isNaN(cinturaNum) && !isNaN(estNum) && estNum > 0) payload.ice = Math.round((cinturaNum / estNum) * 100) / 100
        }

        if (Object.keys(payload).length === 0) {
          toast('No hay cambios para guardar')
          setIsSaving(false)
          return
        }

        const { error } = await supabase.from('evaluaciones').update(payload).eq('id', evaluation.id)
        if (error) {
          setErrores([error.message])
          toast.error(error.message)
          setIsSaving(false)
          return
        }

        toast.success('Evaluación actualizada')
        if (onSaved) {
          try { onSaved() } catch {}
        }
        onClose()
        return
      }

      // CREATE NEW EVALUATION flow (full validation)
      const validation = calcularResultados()
      if (!validation || !validation.valid) {
        setIsSaving(false)
        return
      }

      const payload: any = {
        cliente_id: clienteId,
        fecha: serializeEvaluationDate(fechaEvaluacion) ?? serializeEvaluationDate(getTodayEvaluationDateInputValue()),
        objetivo,
        patologias: patologias || null,
        peso: Number(peso) || null,
        estatura: Number(estatura) || null,
        porcentaje_grasa: validation.resultados?.porcentajeGrasa ?? (porcentajeGrasa ? Number(porcentajeGrasa) : null),
        tipo_medicion: tipoMedicion || null,
        masa_muscular: tipoMedicion === 'InBody' ? (masaMuscular ? Number(masaMuscular) : null) : null,
        masa_libre_grasa: tipoMedicion === 'InBody' ? (masaGrasaKg ? Number(masaGrasaKg) : null) : null,
        agua_corporal: tipoMedicion === 'InBody' ? (aguaCorporalKg ? Number(aguaCorporalKg) : null) : null,
        grasa_visceral: tipoMedicion === 'InBody' ? (grasaVisceral ? Number(grasaVisceral) : null) : null,
        pliegues: tipoMedicion === 'Caliper' ? pliegues : null,
        cintura: agregarPerimetros ? (cintura ? Number(cintura) : null) : null,
        cadera: agregarPerimetros ? (cadera ? Number(cadera) : null) : null,
        icc: validation.resultados?.icc ?? null,
        ice: validation.resultados?.ice ?? null,
        imc: validation.resultados?.imc ?? null,
        categoria_imc: validation.resultados?.categoriaImc ?? (validation.resultados?.imc ? getBMICategory(validation.resultados.imc) : null),
        meta: meta || null,
      }

      const { error } = await supabase.from('evaluaciones').insert([payload])
      if (error) {
        setErrores([error.message])
        toast.error(error.message)
        setIsSaving(false)
        return
      }

      toast.success('Evaluación guardada')
      if (onSaved) {
        try { onSaved() } catch {}
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error guardando evaluación'
      setErrores([msg])
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-[min(100vw-1.5rem,520px)] p-0 overflow-hidden">
        <DialogTitle asChild>
          <div className="px-4 pt-4 pb-3 border-b bg-muted/40 flex flex-col items-center text-center gap-1">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{isEditing ? 'Editar' : 'Nueva'} evaluación</p>
            <h3 className="text-lg font-semibold text-foreground">Datos rápidos y cálculo previo</h3>
          </div>
        </DialogTitle>
        <div className="max-h-[72vh] overflow-auto px-4 pb-4 pt-3 space-y-5 bg-background">
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Cliente</span>
              <span className="text-xs text-muted-foreground">{isEditing ? 'Cliente bloqueado en edición' : 'Selecciona un cliente para comenzar'}</span>
            </div>
            <Select
              disabled={isEditing}
              value={clienteId}
              onValueChange={(v) => { setClienteId(v); markDirty('cliente_id') }}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClientes ? 'Cargando...' : 'Selecciona un cliente'} />
              </SelectTrigger>
              <SelectContent>
                {clientes.length === 0 ? (
                  <SelectItem value="__no_client" disabled>{loadingClientes ? 'Cargando clientes...' : 'No hay clientes'}</SelectItem>
                ) : (
                  clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre_completo ?? c.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {clienteId && (
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const sel = clientes.find((c) => c.id === clienteId)
                  return (
                    <>
                      Edad: {sel ? computeAge(sel.fecha_nacimiento) : '—'} · Género: {sel?.genero ?? '—'}
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha *</label>
                <Input type="date" value={fechaEvaluacion} onChange={e => { setFechaEvaluacion(e.target.value); markDirty('fecha') }} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Objetivo general *</label>
                <Input value={objetivo} onChange={e => { setObjetivo(e.target.value); markDirty('objetivo') }} maxLength={100} placeholder="Ej: bajar grasa, fuerza..." />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">¿Patologías?</span>
                <span className="text-xs text-muted-foreground">Sólo si aplica</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={tienePatologias ? "default" : "outline"} onClick={() => setTienePatologias(true)}>Sí</Button>
                <Button size="sm" variant={!tienePatologias ? "default" : "outline"} onClick={() => setTienePatologias(false)}>No</Button>
              </div>
              {tienePatologias && (
                <Input value={patologias} onChange={e => { setPatologias(e.target.value); markDirty('patologias') }} maxLength={255} placeholder="Especificar patologías" />
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Mediciones básicas</span>
              <span className="text-xs text-muted-foreground">Peso / Estatura</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Peso (kg) *</label>
                <Input type="number" value={peso} onChange={e => { setPeso(e.target.value); markDirty('peso') }} maxLength={3} min={0} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Estatura (cm) *</label>
                <Input type="number" value={estatura} onChange={e => { setEstatura(e.target.value); markDirty('estatura') }} maxLength={3} min={0} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Métrica corporal</label>
                <Select value={tipoMedicion} onValueChange={(v) => { setTipoMedicion(v); markDirty('tipo_medicion') }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="InBody">InBody</SelectItem>
                    <SelectItem value="Caliper">Caliper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">% Grasa *</label>
                <Input type="number" value={porcentajeGrasa} onChange={e => { setPorcentajeGrasa(e.target.value); markDirty('porcentaje_grasa') }} min={0} max={100} disabled={tipoMedicion === 'Caliper'} readOnly={tipoMedicion === 'Caliper'} />
              </div>
            </div>

            {tipoMedicion === 'Caliper' && caliperInfo && (
              <div className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Método: {caliperInfo.method || caliperInfo.method}</div>
                <div>Suma pliegues: {caliperInfo.sum ?? '-'} mm</div>
                {caliperInfo.dens !== undefined && <div>Densidad: {caliperInfo.dens}</div>}
                {caliperInfo.age !== undefined && caliperInfo.gender && (
                  <div>Edad: {caliperInfo.age ?? '-'} años · Sexo: {caliperInfo.gender}</div>
                )}
              </div>
            )}

            {tipoMedicion === 'InBody' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Masa muscular (kg)</label>
                  <Input type="number" value={masaMuscular} onChange={e => { setMasaMuscular(e.target.value); setMasaMuscularAuto(false); markDirty('masa_muscular') }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Masa libre de grasa (kg)</label>
                  <Input type="number" value={masaGrasaKg} onChange={e => { setMasaGrasaKg(e.target.value); setMasaGrasaAuto(false); markDirty('masa_grasa') }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Agua corporal (L)</label>
                  <Input type="number" value={aguaCorporalKg} onChange={e => { setAguaCorporalKg(e.target.value); markDirty('agua_corporal') }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Grasa visceral (nivel)</label>
                  <Input type="number" value={grasaVisceral} onChange={e => { setGrasaVisceral(e.target.value); markDirty('grasa_visceral') }} />
                </div>
              </div>
            )}

            {tipoMedicion === "Caliper" && (
              <>
                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-sm font-semibold">Densidad corporal</div>
                  <div className="text-xs text-muted-foreground">Durnin &amp; Womersley</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input placeholder="Bicipital" type="number" value={pliegues.bicipital} onChange={e => { setPliegues({ ...pliegues, bicipital: e.target.value }); markDirty('pliegues') }} />
                  <Input placeholder="Tricipital" type="number" value={pliegues.tricipital} onChange={e => { setPliegues({ ...pliegues, tricipital: e.target.value }); markDirty('pliegues') }} />
                  <Input placeholder="Subescapular" type="number" value={pliegues.subescapular} onChange={e => { setPliegues({ ...pliegues, subescapular: e.target.value }); markDirty('pliegues') }} />
                  <Input placeholder="Suprailiaco" type="number" value={pliegues.suprailiaco} onChange={e => { setPliegues({ ...pliegues, suprailiaco: e.target.value }); markDirty('pliegues') }} />
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Perímetros opcionales</span>
              <span className="text-xs text-muted-foreground">Cintura / Cadera</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={agregarPerimetros ? "default" : "outline"} onClick={() => { setAgregarPerimetros(true); markDirty('agregar_perimetros') }}>Sí</Button>
              <Button size="sm" variant={!agregarPerimetros ? "default" : "outline"} onClick={() => { setAgregarPerimetros(false); markDirty('agregar_perimetros') }}>No</Button>
            </div>
            {agregarPerimetros && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Cintura (cm)</label>
                  <Input type="number" value={cintura} onChange={e => { setCintura(e.target.value); markDirty('cintura') }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cadera (cm)</label>
                  <Input type="number" value={cadera} onChange={e => { setCadera(e.target.value); markDirty('cadera') }} />
                </div>
              </div>
            )}
          </div>

          {errores.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errores.map((err, i) => <div key={i}>{err}</div>)}
            </div>
          )}

          {resultados && errores.length === 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="text-sm font-semibold">Análisis previo</div>
              <div className="text-sm">IMC: <span className="font-semibold">{resultados.imc}</span></div>
              {resultados.categoriaImc && (
                <div className="text-xs text-muted-foreground">Categoría: {resultados.categoriaImc}</div>
              )}
              <div className="text-xs text-muted-foreground">Finaliza para ver el detalle completo.</div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Meta propuesta para este mes</span>
            </div>
            <Input value={meta} onChange={e => { setMeta(e.target.value); markDirty('meta') }} maxLength={255} placeholder="Ej: bajar % grasa en 30 días un 2%" />
          </div>

          <div className="pt-2 pb-2">
            <div className="flex flex-col gap-2">
              <Button disabled={isSaving} className="w-full" onClick={handleGuardar}>
                {isSaving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Guardar evaluación')}
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
