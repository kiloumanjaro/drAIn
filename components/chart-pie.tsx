'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { EllipsisVertical } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useInlets } from '@/hooks/useInlets';
import { useOutlets } from '@/hooks/useOutlets';
import { useDrain } from '@/hooks/useDrain';
import { usePipes } from '@/hooks/usePipes';

export const description = 'Drainage infrastructure distribution';

const chartConfig = {
  count: {
    label: 'Count',
  },
  inlets: {
    label: 'Inlets',
    color: 'hsl(142, 76%, 36%)', // Green
  },
  outlets: {
    label: 'Outlets',
    color: 'hsl(0, 84%, 60%)', // Red
  },
  stormDrains: {
    label: 'Drains',
    color: 'hsl(217, 91%, 60%)', // Blue
  },
  pipes: {
    label: 'Pipes',
    color: 'hsl(271, 91%, 65%)', // Purple
  },
} satisfies ChartConfig;

interface ChartPieDonutTextProps {
  onNavigate?: (
    dataset: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  ) => void;
}

export function ChartPieDonutText({ onNavigate }: ChartPieDonutTextProps = {}) {
  const { inlets, loading: loadingInlets } = useInlets();
  const { outlets, loading: loadingOutlets } = useOutlets();
  const { drains, loading: loadingDrains } = useDrain();
  const { pipes, loading: loadingPipes } = usePipes();

  const chartData = React.useMemo(() => {
    return [
      {
        type: 'inlets',
        count: inlets.length,
        fill: 'var(--color-inlets)',
      },
      {
        type: 'outlets',
        count: outlets.length,
        fill: 'var(--color-outlets)',
      },
      {
        type: 'stormDrains',
        count: drains.length,
        fill: 'var(--color-stormDrains)',
      },
      {
        type: 'pipes',
        count: pipes.length,
        fill: 'var(--color-pipes)',
      },
    ];
  }, [inlets, outlets, drains, pipes]);

  const totalInfrastructure = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const isLoading =
    loadingInlets || loadingOutlets || loadingDrains || loadingPipes;

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Drainage Infrastructure</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[250px] flex-1 items-center justify-center pb-0">
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const handleNavigate = (
    dataset: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  ) => {
    onNavigate?.(dataset);
  };

  return (
    <Card className="flex flex-col gap-0 pb-0">
      <CardHeader className="relative flex items-start justify-between pr-4 pb-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Drainage Infrastructure</CardTitle>
          <CardDescription className="text-xs">
            Distribution of components
          </CardDescription>
        </div>
        {onNavigate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleNavigate('man_pipes')}>
                Pipes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate('storm_drains')}>
                Drains
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate('inlets')}>
                Inlets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate('outlets')}>
                Outlets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="type"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalInfrastructure.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Items
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
