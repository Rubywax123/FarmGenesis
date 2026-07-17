"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, NumberInput } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MONTH_NAMES } from "@/engine/types";
import { fromMonthValue, toMonthValue, type TabProps } from "./types";

export function PlantingTab({ input, onChange }: TabProps): React.JSX.Element {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {input.blocks.map((block, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{block.name || `Block ${index + 1}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Block name" htmlFor={`block-name-${index}`}>
                <Input
                  id={`block-name-${index}`}
                  value={block.name}
                  onChange={(event) =>
                    onChange((prev) => ({
                      ...prev,
                      blocks: prev.blocks.map((b, i) =>
                        i === index ? { ...b, name: event.target.value } : b,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="Area" htmlFor={`block-area-${index}`} unit="ha">
                <NumberInput
                  id={`block-area-${index}`}
                  min={0}
                  step={1}
                  value={block.areaHa}
                  onValueChange={(value) =>
                    onChange((prev) => ({
                      ...prev,
                      blocks: prev.blocks.map((b, i) =>
                        i === index ? { ...b, areaHa: value } : b,
                      ),
                    }))
                  }
                />
              </Field>
              <Field
                label="Planting date"
                htmlFor={`block-date-${index}`}
                hint="First of the month the block goes in the ground."
              >
                <Input
                  id={`block-date-${index}`}
                  type="month"
                  value={toMonthValue(block.plantingDate)}
                  onChange={(event) =>
                    onChange((prev) => ({
                      ...prev,
                      blocks: prev.blocks.map((b, i) =>
                        i === index
                          ? { ...b, plantingDate: fromMonthValue(event.target.value) }
                          : b,
                      ),
                    }))
                  }
                />
              </Field>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold">Yield curve</h3>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Tonnes per hectare by plant age at harvest. Plants ramp up over three years.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Year 1" htmlFor="yield-y1" unit="t/ha">
            <NumberInput
              id="yield-y1"
              min={0}
              step={1}
              value={input.yieldCurve.year1}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  yieldCurve: { ...prev.yieldCurve, year1: value },
                }))
              }
            />
          </Field>
          <Field label="Year 2" htmlFor="yield-y2" unit="t/ha">
            <NumberInput
              id="yield-y2"
              min={0}
              step={1}
              value={input.yieldCurve.year2}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  yieldCurve: { ...prev.yieldCurve, year2: value },
                }))
              }
            />
          </Field>
          <Field label="Year 3 and later" htmlFor="yield-y3" unit="t/ha">
            <NumberInput
              id="yield-y3"
              min={0}
              step={1}
              value={input.yieldCurve.year3plus}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  yieldCurve: { ...prev.yieldCurve, year3plus: value },
                }))
              }
            />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Harvest season</h3>
        <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
          Harvest runs between these calendar months; no production before April of the
          first harvest year.
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="First harvest year" htmlFor="first-harvest-year">
            <NumberInput
              id="first-harvest-year"
              min={2000}
              step={1}
              value={input.firstHarvestYear}
              onValueChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  firstHarvestYear: Math.round(value),
                }))
              }
            />
          </Field>
          <Field label="Window start" htmlFor="window-start">
            <Select
              id="window-start"
              value={input.harvestWindow.startMonth}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  harvestWindow: {
                    ...prev.harvestWindow,
                    startMonth: Number(event.target.value),
                  },
                }))
              }
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Window end" htmlFor="window-end">
            <Select
              id="window-end"
              value={input.harvestWindow.endMonth}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  harvestWindow: {
                    ...prev.harvestWindow,
                    endMonth: Number(event.target.value),
                  },
                }))
              }
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}
