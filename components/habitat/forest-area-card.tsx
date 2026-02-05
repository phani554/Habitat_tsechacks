'use client'

import { TrendingUp, TrendingDown, Minus, MapPin, Droplets, Thermometer, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ForestAreaData } from '@/lib/api'

interface ForestAreaCardProps {
  forest: ForestAreaData
  isSelected: boolean
  onClick: () => void
}

export function ForestAreaCard({ forest, isSelected, onClick }: ForestAreaCardProps) {
  const TrendIcon = forest.trend.direction === 'up' 
    ? TrendingUp 
    : forest.trend.direction === 'down' 
      ? TrendingDown 
      : Minus

  const trendColor = forest.trend.direction === 'up' 
    ? 'text-emerald-400' 
    : forest.trend.direction === 'down' 
      ? 'text-rose-400' 
      : 'text-amber-400'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all',
        isSelected
          ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
          : 'border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/50'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-foreground">{forest.name}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" />
            {forest.region}
          </div>
        </div>
        <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{forest.trend.percentage}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-background/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Leaf className="h-3 w-3 text-emerald-400" />
            NDVI
          </div>
          <p className="font-mono text-sm font-medium text-emerald-400">
            {forest.metrics.ndvi_current.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Thermometer className="h-3 w-3 text-amber-400" />
            Temp
          </div>
          <p className="font-mono text-sm font-medium text-amber-400">
            {forest.metrics.temperature}°C
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Droplets className="h-3 w-3 text-blue-400" />
            Humidity
          </div>
          <p className="font-mono text-sm font-medium text-blue-400">
            {forest.metrics.humidity}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Forest Cover</span>
        <span className="font-mono font-medium text-foreground">
          {forest.metrics.forest_cover.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
          style={{ width: `${Math.min(100, forest.metrics.forest_cover)}%` }}
        />
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">{forest.trend.description}</p>
    </button>
  )
}
