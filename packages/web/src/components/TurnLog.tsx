import { Box, Collapse, Group, Paper, ScrollArea, SimpleGrid, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { useState, type ReactNode } from 'react';
import type { Region, TurnDiagnostics } from '@earth-alliance/engine';
import { temperatureColor } from '../scene/metricColor.js';
import type { TurnRecord } from '../game/useGame.js';

// Delta chip colors (mirror DESIGN-SYSTEM.md): arrow = numeric direction, color = good/bad/neutral.
const GOOD = '#63e6be';
const BAD = '#ff6b6b';

/** Whether an increase in a field is good, bad, or value-neutral for the planet/region. */
type Polarity = 'up-good' | 'up-bad' | 'neutral';

function deltaColor(delta: number, polarity: Polarity): string | undefined {
  if (Math.abs(delta) < 1e-9 || polarity === 'neutral') return undefined; // dimmed
  const good = polarity === 'up-good' ? delta > 0 : delta < 0;
  return good ? GOOD : BAD;
}

function arrow(delta: number): string {
  if (delta > 1e-9) return '▲';
  if (delta < -1e-9) return '▼';
  return '—';
}

/** A change chip vs. the previous turn. `null` prev (baseline turn) renders nothing. */
function Delta({ curr, prev, polarity, format }: {
  curr: number; prev: number | null; polarity: Polarity; format: (n: number) => string;
}): ReactNode {
  if (prev === null) return null;
  const d = curr - prev;
  const color = deltaColor(d, polarity);
  const mag = Math.abs(d) < 1e-9 ? '0' : format(Math.abs(d));
  return (
    <Text component="span" size="xs" fw={700} ml={6} c={color ?? 'dimmed'} span>
      {arrow(d)} {mag}
    </Text>
  );
}

/** One label : value (+ optional delta) cell in the ledger grid. */
function Cell({ label, value, valueColor, delta }: {
  label: string; value: string; valueColor?: string; delta?: ReactNode;
}) {
  return (
    <Group justify="space-between" gap={4} wrap="nowrap"
      style={{ borderBottom: '1px dotted #303237', paddingBottom: 1 }}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="xs" fw={600} c={valueColor} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}{delta}
      </Text>
    </Group>
  );
}

function BlockLabel({ children }: { children: ReactNode }) {
  return (
    <Text tt="uppercase" c="dimmed" mt={6} mb={3} fw={600}
      style={{ fontSize: 10, letterSpacing: '0.07em' }}>
      {children}
    </Text>
  );
}

function formatPop(pop: number): string {
  return pop >= 1e9 ? `${(pop / 1e9).toFixed(2)}B` : `${(pop / 1e6).toFixed(0)}M`;
}

// ── CALC ("More") section: engine intermediates, formatted like the ledger above. ──
const mult = (n: number) => `${n.toFixed(3)}×`;
const signed = (n: number, digits: number) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
const tempSigned = (n: number) => `${signed(n, 2)} °C`;
const ppmSigned = (n: number) => `${signed(n, 1)} ppm`;
const pctSigned = (n: number, digits: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(digits)}%`;

/** Earth-tinted block label that marks a "derived internals" section apart from headline state. */
function CalcLabel({ children }: { children: ReactNode }) {
  return (
    <Text tt="uppercase" mt={7} mb={3} fw={700} c="#0ca678"
      style={{ fontSize: 10, letterSpacing: '0.07em' }}>
      {children}
    </Text>
  );
}

/** Global climate, economy, and resource intermediates the pipeline computed this turn. */
function PlanetCalcBlock({ d }: { d: TurnDiagnostics }) {
  const warming = Math.max(0, d.deltaTemperature); // the positive-only driver ecosystems/support feel
  return (
    <>
      <CalcLabel>Calc · Climate</CalcLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="ΔTemp" value={tempSigned(d.deltaTemperature)} />
        <Cell label="Warming⁺" value={tempSigned(warming)} />
        <Cell label="Eq. temp" value={tempSigned(d.equilibriumTemp)} />
        <Cell label="CO₂ ratio" value={mult(d.co2Ratio)} />
        <Cell label="ΔCO₂" value={ppmSigned(d.deltaPpm)} />
        <Cell label="Gross emis" value={`${d.grossEmissions.toFixed(0)} Gt`} />
      </SimpleGrid>
      <CalcLabel>Calc · Economy</CalcLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="Damage" value={`${(d.damageFraction * 100).toFixed(2)}%`} />
        <Cell label="Base growth" value={mult(d.baseGrowthFactor)} />
        <Cell label="Decarb" value={mult(d.decarbFactor)} />
      </SimpleGrid>
      <CalcLabel>Calc · Resources</CalcLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="World pop" value={formatPop(d.worldPopulation)} />
        <Cell label="World GDP" value={`$${(d.worldGdp / 1e12).toFixed(1)}T`} />
        <Cell label="Avg support" value={d.avgSupport.toFixed(1)} />
        <Cell label="Money regen" value={signed(d.moneyGain, 1)} />
      </SimpleGrid>
    </>
  );
}

/** The selected region's growth mechanics, environmental pressures, and support breakdown. */
function RegionCalcBlock({ d, region }: { d: TurnDiagnostics; region: Region }) {
  const id = region.id;
  const econ = d.growthByRegion[id];
  const scarcity = d.scarcityByRegion[id];
  const constraint = d.constraintFactorByRegion[id];
  const output = d.outputRatioByRegion[id];
  const pop = d.popGrowthByRegion[id];
  const waterLoss = d.waterLossByRegion[id];
  const landLoss = d.landLossByRegion[id];
  const bioLoss = d.bioLossByRegion[id];
  const sTemp = d.supportTempTermByRegion[id];
  const sEcon = d.supportEconTermByRegion[id];
  const sEquity = d.supportEquityTermByRegion[id];
  const eqDrift = d.equityDriftByRegion[id];
  const num = (n: number | undefined, fmt: (x: number) => string) => (n === undefined ? '—' : fmt(n));
  return (
    <>
      <CalcLabel>
        Calc · <Text component="span" c="dimmed" fw={600} style={{ fontSize: 10 }} span>{region.name}</Text> growth
      </CalcLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="Econ growth" value={num(econ, (x) => pctSigned(x, 1))} />
        <Cell label="Scarcity" value={num(scarcity, (x) => x.toFixed(2))} />
        <Cell label="Constraint" value={num(constraint, mult)} />
        <Cell label="Output ratio" value={num(output, mult)} />
        <Cell label="Pop growth" value={num(pop, (x) => `${(x * 100).toFixed(2)}%/yr`)} />
      </SimpleGrid>
      <CalcLabel>Pressures (pre-clamp drop)</CalcLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="Water loss" value={num(waterLoss, (x) => signed(-x, 1))} />
        <Cell label="Land loss" value={num(landLoss, (x) => signed(-x, 1))} />
        <Cell label="Bio loss" value={num(bioLoss, (x) => signed(-x, 1))} />
      </SimpleGrid>
      <CalcLabel>Support Δ breakdown</CalcLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="from warming" value={num(sTemp, (x) => signed(x, 1))} />
        <Cell label="from growth" value={num(sEcon, (x) => signed(x, 1))} />
        <Cell label="from equity" value={num(sEquity, (x) => signed(x, 1))} />
        <Cell label="Equity drift" value={num(eqDrift, (x) => signed(-x, 2))} />
      </SimpleGrid>
    </>
  );
}

/** Dimmed full-width toggle that reveals/hides a turn's CALC section. */
function MoreToggle({ opened, onToggle }: { opened: boolean; onToggle: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <UnstyledButton onClick={onToggle} aria-expanded={opened}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        width: '100%', marginTop: 8, paddingTop: 4, paddingBottom: 1,
        borderTop: '1px solid var(--mantine-color-dark-4)',
        color: hover ? GOOD : 'var(--mantine-color-dimmed)',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
      <Text component="span" span style={{ color: 'inherit', fontSize: 11, transform: opened ? 'rotate(180deg)' : undefined }}>▾</Text>
      {opened ? 'Less' : 'More'}
    </UnstyledButton>
  );
}

function PlanetBlock({ record, prev }: { record: TurnRecord; prev: TurnRecord | null }) {
  const c = record.state.climate;
  const pc = prev?.state.climate ?? null;
  const df = record.diagnostics?.damageFraction ?? null;
  const pdf = prev?.diagnostics?.damageFraction ?? null;
  return (
    <>
      <BlockLabel>Planet</BlockLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="Warming" value={`+${c.temperatureAnomaly.toFixed(2)} °C`}
          valueColor={temperatureColor(c.temperatureAnomaly)}
          delta={<Delta curr={c.temperatureAnomaly} prev={pc?.temperatureAnomaly ?? null}
            polarity="up-bad" format={(n) => n.toFixed(2)} />} />
        <Cell label="CO₂" value={`${c.co2Concentration.toFixed(0)} ppm`}
          delta={<Delta curr={c.co2Concentration} prev={pc?.co2Concentration ?? null}
            polarity="up-bad" format={(n) => n.toFixed(0)} />} />
        <Cell label="Emissions" value={`${c.annualEmissions.toFixed(1)} Gt`}
          delta={<Delta curr={c.annualEmissions} prev={pc?.annualEmissions ?? null}
            polarity="up-bad" format={(n) => n.toFixed(1)} />} />
        <Cell label="Damage" value={df === null ? '—' : `${(df * 100).toFixed(2)}%`}
          valueColor={df === null ? undefined : BAD}
          delta={df !== null && pdf !== null
            ? <Delta curr={df * 100} prev={pdf * 100} polarity="up-bad" format={(n) => n.toFixed(2)} />
            : null} />
      </SimpleGrid>
    </>
  );
}

function RegionBlock({ record, prev, region }: {
  record: TurnRecord; prev: TurnRecord | null; region: Region;
}) {
  const p = prev?.state.regions.find((r) => r.id === region.id) ?? null;
  const growth = record.diagnostics?.growthByRegion[region.id];
  const idx = (curr: number, prevVal: number | undefined | null, polarity: Polarity) =>
    <Delta curr={curr} prev={prevVal ?? null} polarity={polarity} format={(n) => n.toFixed(0)} />;
  return (
    <>
      <BlockLabel>
        {region.name}{' '}
        <Text component="span" c={BAD} fw={700}
          style={{ fontSize: 10, background: '#2a1f1f', borderRadius: 999, padding: '1px 7px' }} span>
          selected
        </Text>
      </BlockLabel>
      <SimpleGrid cols={2} spacing="md" verticalSpacing={2}>
        <Cell label="GDP/cap" value={Math.round(region.gdpPerCapita).toLocaleString()}
          delta={growth === undefined ? null : (
            <Text component="span" size="xs" fw={700} ml={6}
              c={Math.abs(growth) < 1e-9 ? 'dimmed' : growth > 0 ? GOOD : BAD} span>
              {arrow(growth)} {(Math.abs(growth) * 100).toFixed(1)}%
            </Text>
          )} />
        <Cell label="Population" value={formatPop(region.population)}
          delta={p ? (
            <Text component="span" size="xs" fw={700} ml={6} c="dimmed" span>
              {arrow(region.population - p.population)}{' '}
              {(Math.abs(region.population - p.population) / p.population * 100).toFixed(1)}%
            </Text>
          ) : null} />
        <Cell label="Support" value={`${Math.round(region.publicSupport)}`}
          delta={idx(region.publicSupport, p?.publicSupport, 'up-good')} />
        <Cell label="Equity" value={`${Math.round(region.equityIndex)}`}
          delta={idx(region.equityIndex, p?.equityIndex, 'up-good')} />
        <Cell label="Biodiversity" value={`${Math.round(region.biodiversityIndex)}`}
          delta={idx(region.biodiversityIndex, p?.biodiversityIndex, 'up-good')} />
        <Cell label="Water" value={`${Math.round(region.waterAvailability)}`}
          delta={idx(region.waterAvailability, p?.waterAvailability, 'up-good')} />
        <Cell label="Land" value={`${Math.round(region.landAvailability)}`}
          delta={idx(region.landAvailability, p?.landAvailability, 'up-good')} />
        <Cell label="Education" value={`${Math.round(region.educationIndex)}`}
          delta={idx(region.educationIndex, p?.educationIndex, 'up-good')} />
        <Cell label="Health" value={`${Math.round(region.healthIndex)}`}
          delta={idx(region.healthIndex, p?.healthIndex, 'up-good')} />
        <Cell label="Median age" value={region.medianAge.toFixed(1)}
          delta={<Delta curr={region.medianAge} prev={p?.medianAge ?? null}
            polarity="neutral" format={(n) => n.toFixed(1)} />} />
        <Cell label="Fertility" value={region.fertilityRate.toFixed(2)}
          delta={<Delta curr={region.fertilityRate} prev={p?.fertilityRate ?? null}
            polarity="neutral" format={(n) => n.toFixed(2)} />} />
        <Cell label="Emissions" value={`${region.regionalEmissions.toFixed(2)} Gt`}
          delta={<Delta curr={region.regionalEmissions} prev={p?.regionalEmissions ?? null}
            polarity="up-bad" format={(n) => n.toFixed(2)} />} />
      </SimpleGrid>
    </>
  );
}

/** One turn's sub-card: headline ledger + an opt-in, self-contained CALC collapse. */
function TurnEntry({ record, prev, selectedRegionId }: {
  record: TurnRecord; prev: TurnRecord | null; selectedRegionId: string | null;
}) {
  const [opened, setOpened] = useState(false); // per-entry: toggling one entry never affects others
  const region = selectedRegionId
    ? record.state.regions.find((r) => r.id === selectedRegionId) ?? null
    : null;
  const d = record.diagnostics;
  return (
    <Box style={{ background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)', borderRadius: 4, padding: 10 }}>
      <Group justify="space-between" align="baseline">
        <Text fw={700} size="sm">Turn {record.turn}</Text>
        <Text size="xs" c="dimmed">{record.year}</Text>
      </Group>
      <PlanetBlock record={record} prev={prev} />
      {region
        ? <RegionBlock record={record} prev={prev} region={region} />
        : <Text size="xs" c="dimmed" fs="italic" mt={6}>Select a region on the map to log its parameters.</Text>}
      {/* The baseline turn has no diagnostics, so no CALC section / toggle. */}
      {d && (
        <>
          <Collapse in={opened}>
            <Box>
              <PlanetCalcBlock d={d} />
              {region && <RegionCalcBlock d={d} region={region} />}
            </Box>
          </Collapse>
          <MoreToggle opened={opened} onToggle={() => setOpened((o) => !o)} />
        </>
      )}
    </Box>
  );
}

export function TurnLog({ turnLog, selectedRegionId }: {
  turnLog: TurnRecord[]; selectedRegionId: string | null;
}) {
  // Newest turn first; each entry still knows its chronological predecessor for deltas.
  const entries = turnLog.map((record, i) => ({ record, prev: i > 0 ? turnLog[i - 1]! : null }))
    .reverse();

  return (
    <Paper p="sm" withBorder>
      <Title order={4} mb="xs">Turn Log</Title>
      <ScrollArea.Autosize mah={340} type="auto">
        <Stack gap="sm">
          {entries.map(({ record, prev }) => (
            <TurnEntry key={record.turn} record={record} prev={prev} selectedRegionId={selectedRegionId} />
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  );
}
