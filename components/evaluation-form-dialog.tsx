import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type ClienteMin = {
  id: string
  nombre_completo?: string
  fecha_nacimiento?: string | null
  genero?: string | null
}

export default function EvaluationFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    const d = new Date()
    return d.toISOString().slice(0, 10) // YYYY-MM-DD for date input
  })
  const [resultados, setResultados] = useState<any | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
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
    if (!sumPliegues || sumPliegues <= 0) return null
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
        return Math.round(fat * 10) / 10
      }
    }

    // Fallback genérico (valor orientativo, mantengo la aproximación previa)
    return Math.round((sumPliegues * 0.153 + 5.783) * 10) / 10
  }

  function calcularResultados() {
    const errores: string[] = [];
    // Validaciones básicas
    if (!clienteId) errores.push("Selecciona un cliente");
    if (!objetivo) errores.push("El objetivo es obligatorio");
    if (!peso || isNaN(Number(peso)) || Number(peso) <= 0) errores.push("Peso inválido");
    if (!estatura || isNaN(Number(estatura)) || Number(estatura) <= 0) errores.push("Estatura inválida");
    if (tipoMedicion === "InBody" && (!porcentajeGrasa || isNaN(Number(porcentajeGrasa)) || Number(porcentajeGrasa) < 0 || Number(porcentajeGrasa) > 100)) {
      errores.push("% Grasa inválido");
    }
    if (tipoMedicion === "Caliper") {
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
      porcentajeGrasaNum = calc ?? porcentajeGrasaNum
    }
    let icc = null, ice = null;
    if (agregarPerimetros) {
      icc = Number(cintura) / Number(cadera);
      ice = Number(cintura) / Number(estatura);
    }
    const resultadosLocal = {
      imc: Math.round(imc * 10) / 10,
      porcentajeGrasa: porcentajeGrasaNum,
      icc: icc ? Math.round(icc * 100) / 100 : null,
      ice: ice ? Math.round(ice * 100) / 100 : null,
    }
    setErrores([]);
    setResultados(resultadosLocal);
    return { valid: true, resultados: resultadosLocal };
  }

  // Compute derived results without running full validation (used for live preview
  // and for auto-filling % grasa when using Caliper)
  function computeDerivedResults() {
    const pesoNum = Number(peso)
    const estaturaNum = Number(estatura) / 100
    let imc = null
    if (pesoNum > 0 && estaturaNum > 0) imc = Math.round((pesoNum / (estaturaNum * estaturaNum)) * 10) / 10

    let porcentajeGrasaNum: number | null = null
    if (tipoMedicion === 'Caliper') {
      const sumaPliegues = Object.values(pliegues).reduce((acc, v) => acc + Number(v || 0), 0)
      if (sumaPliegues > 0) {
        const calc = calculateCaliperPercentage(sumaPliegues)
        if (calc !== null) {
          porcentajeGrasaNum = calc
          setPorcentajeGrasa(String(porcentajeGrasaNum))
        }
      }
    } else if (porcentajeGrasa && !isNaN(Number(porcentajeGrasa))) {
      porcentajeGrasaNum = Number(porcentajeGrasa)
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

    const resultadosLocal: any = {
      ...(imc !== null ? { imc } : {}),
      ...(porcentajeGrasaNum !== null ? { porcentajeGrasa: porcentajeGrasaNum } : {}),
      ...(icc !== null ? { icc } : {}),
      ...(ice !== null ? { ice } : {}),
    }

    setResultados(resultadosLocal)
    return resultadosLocal
  }

  // When pliegues change and tipoMedicion is Caliper, auto-calc % grasa and derived results
  useEffect(() => {
    if (tipoMedicion === 'Caliper') {
      computeDerivedResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pliegues.bicipital, pliegues.tricipital, pliegues.subescapular, pliegues.suprailiaco, tipoMedicion, peso, estatura, cintura, cadera, agregarPerimetros])

  // Update derived results for live preview when inputs change
  useEffect(() => {
    computeDerivedResults()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peso, estatura, porcentajeGrasa, tipoMedicion, agregarPerimetros, cintura, cadera])

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
    const validation = calcularResultados()
    if (!validation || !validation.valid) return
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrores(["Usuario no autenticado"])
        setIsSaving(false)
        return
      }

      const payload: any = {
        cliente_id: clienteId,
        fecha: fechaEvaluacion ? new Date(fechaEvaluacion).toISOString() : new Date().toISOString(),
        objetivo,
        patologias: patologias || null,
        peso: Number(peso) || null,
        estatura: Number(estatura) || null,
        porcentaje_grasa: validation.resultados?.porcentajeGrasa ?? (porcentajeGrasa ? Number(porcentajeGrasa) : null),
        tipo_medicion: tipoMedicion || null,
        pliegues: tipoMedicion === 'Caliper' ? pliegues : null,
        cintura: agregarPerimetros ? (cintura ? Number(cintura) : null) : null,
        cadera: agregarPerimetros ? (cadera ? Number(cadera) : null) : null,
        icc: validation.resultados?.icc ?? null,
        ice: validation.resultados?.ice ?? null,
        imc: validation.resultados?.imc ?? null,
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
      <DialogContent>
        <div className="space-y-3">
          {/* Selección de cliente */}
          <div className="grid gap-2">
            <label>Cliente</label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClientes ? 'Cargando...' : 'Selecciona un cliente'} />
              </SelectTrigger>
              <SelectContent>
                {clientes.length === 0 ? (
                  <SelectItem value="">{loadingClientes ? 'Cargando clientes...' : 'No hay clientes'}</SelectItem>
                ) : (
                  clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre_completo ?? c.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {/* Mostrar edad y género si cliente seleccionado */}
            {clienteId && (
              <div className="text-xs text-muted-foreground mb-2">
                {(() => {
                  const sel = clientes.find((c) => c.id === clienteId)
                  return (
                    <>
                      Edad: {sel ? computeAge(sel.fecha_nacimiento) : '—'} | Género: {sel?.genero ?? '—'}
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Fecha de evaluación */}
          <label>Fecha de evaluación</label>
          <Input type="date" value={fechaEvaluacion} onChange={e => setFechaEvaluacion(e.target.value)} />

          {/* Objetivo */}
          <label>Objetivo</label>
          <Input value={objetivo} onChange={e => setObjetivo(e.target.value)} maxLength={100} placeholder="Ej: bajar grasa, fuerza..." />

          {/* Patologías */}
          <label>¿Patologías?</label>
          <div className="flex gap-2">
            <Button variant={tienePatologias ? "default" : "outline"} onClick={() => setTienePatologias(true)}>Sí</Button>
            <Button variant={!tienePatologias ? "default" : "outline"} onClick={() => setTienePatologias(false)}>No</Button>
          </div>
          {tienePatologias && (
            <Input value={patologias} onChange={e => setPatologias(e.target.value)} maxLength={255} placeholder="Especificar patologías" />
          )}

          {/* Datos antropométricos */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label>Peso (kg)</label>
              <Input type="number" value={peso} onChange={e => setPeso(e.target.value)} maxLength={3} min={0} />
            </div>
            <div>
              <label>Estatura (cm)</label>
              <Input type="number" value={estatura} onChange={e => setEstatura(e.target.value)} maxLength={3} min={0} />
            </div>
          </div>

          <label>Método de evaluación corporal</label>
          <Select value={tipoMedicion} onValueChange={setTipoMedicion}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="InBody">InBody</SelectItem>
              <SelectItem value="Caliper">Caliper</SelectItem>
            </SelectContent>
          </Select>

          <label>% Grasa</label>
          <Input type="number" value={porcentajeGrasa} onChange={e => setPorcentajeGrasa(e.target.value)} min={0} max={100} disabled={tipoMedicion === 'Caliper'} readOnly={tipoMedicion === 'Caliper'} />

          {/* Pliegues si Caliper */}
          {tipoMedicion === "Caliper" && (
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Bicipital" type="number" value={pliegues.bicipital} onChange={e => setPliegues({ ...pliegues, bicipital: e.target.value })} />
              <Input placeholder="Tricipital" type="number" value={pliegues.tricipital} onChange={e => setPliegues({ ...pliegues, tricipital: e.target.value })} />
              <Input placeholder="Subescapular" type="number" value={pliegues.subescapular} onChange={e => setPliegues({ ...pliegues, subescapular: e.target.value })} />
              <Input placeholder="Suprailiaco" type="number" value={pliegues.suprailiaco} onChange={e => setPliegues({ ...pliegues, suprailiaco: e.target.value })} />
            </div>
          )}

          {/* Perímetros */}
          <label>¿Agregar perímetros?</label>
          <div className="flex gap-2">
            <Button variant={agregarPerimetros ? "default" : "outline"} onClick={() => setAgregarPerimetros(true)}>Sí</Button>
            <Button variant={!agregarPerimetros ? "default" : "outline"} onClick={() => setAgregarPerimetros(false)}>No</Button>
          </div>
          {agregarPerimetros && (
            <>
              <label>Cintura (cm)</label>
              <Input type="number" value={cintura} onChange={e => setCintura(e.target.value)} />
              <label>Cadera (cm)</label>
              <Input type="number" value={cadera} onChange={e => setCadera(e.target.value)} />
            </>
          )}

          {/* Meta */}
          <label>Meta (opcional)</label>
          <Input value={meta} onChange={e => setMeta(e.target.value)} maxLength={255} placeholder="Ej: bajar % grasa en 30 días un 2%" />

          {/* Mostrar errores */}
          {errores.length > 0 && (
            <div className="text-red-500 text-sm mt-2">
              {errores.map((err, i) => <div key={i}>{err}</div>)}
            </div>
          )}

          {/* Mostrar resultados solo si existen y no hay errores */}
          {resultados && errores.length === 0 && (
            <div className="mt-4 p-4 border rounded bg-muted">
              <div><b>Resultados:</b></div>
              <div>IMC: {resultados.imc}</div>
              <div>% Grasa: {resultados.porcentajeGrasa}</div>
              {resultados.icc !== null && <div>ICC: {resultados.icc}</div>}
              {resultados.ice !== null && <div>ICE: {resultados.ice}</div>}
            </div>
          )}

          {/* Botones */}
          <div className="mt-4 flex flex-col gap-2">
            <button
              disabled={isSaving}
              className="bg-primary text-white rounded-md py-2 font-semibold hover:bg-primary/90 transition w-full disabled:opacity-60"
              onClick={handleGuardar}
            >
              {isSaving ? 'Guardando...' : 'Guardar evaluación'}
            </button>
            <button
              className="border border-input rounded-md py-2 font-semibold hover:bg-muted transition w-full"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
