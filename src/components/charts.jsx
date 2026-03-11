import { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import useStore from '../lib/store'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend)

// Disable all default legends
ChartJS.defaults.plugins.legend.display = false
ChartJS.defaults.responsive = true
ChartJS.defaults.maintainAspectRatio = false

export function DonutChart({ data, centerLabel, centerValue }) {
  const { darkMode } = useStore()

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [{
      data: data.map(d => d.value),
      backgroundColor: data.map(d => d.color),
      borderWidth: 0,
      cutout: '72%',
      borderRadius: 4,
      spacing: 2
    }]
  }

  const options = {
    plugins: {
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#fff',
        titleColor: darkMode ? '#f1f5f9' : '#1e293b',
        bodyColor: darkMode ? '#94a3b8' : '#64748b',
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
            const percent = ((ctx.raw / total) * 100).toFixed(0)
            return ` ${ctx.label}: R$ ${ctx.raw.toFixed(2)} (${percent}%)`
          }
        }
      }
    }
  }

  return (
    <div className="relative">
      <div className="h-52">
        <Doughnut data={chartData} options={options} />
      </div>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-slate-500 dark:text-slate-400">{centerLabel}</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white">{centerValue}</p>
        </div>
      )}
    </div>
  )
}

export function BarChart({ labels, datasets, stacked = false }) {
  const { darkMode } = useStore()

  const data = {
    labels,
    datasets: datasets.map(ds => ({
      ...ds,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 32
    }))
  }

  const options = {
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: darkMode ? '#94a3b8' : '#64748b', font: { size: 11 } },
        stacked
      },
      y: {
        display: false,
        stacked,
        beginAtZero: true
      }
    },
    plugins: {
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#fff',
        titleColor: darkMode ? '#f1f5f9' : '#1e293b',
        bodyColor: darkMode ? '#94a3b8' : '#64748b',
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: R$ ${ctx.raw.toFixed(2)}`
        }
      }
    }
  }

  return (
    <div className="h-52">
      <Bar data={data} options={options} />
    </div>
  )
}

export function LineChart({ labels, data, gradient = true }) {
  const { darkMode } = useStore()
  const chartRef = useRef(null)

  const chartData = {
    labels,
    datasets: [{
      data,
      borderColor: '#f97316',
      backgroundColor: (context) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return 'rgba(249, 115, 22, 0.1)'
        const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        grad.addColorStop(0, 'rgba(249, 115, 22, 0.3)')
        grad.addColorStop(1, 'rgba(249, 115, 22, 0.01)')
        return grad
      },
      borderWidth: 2.5,
      fill: gradient,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#f97316',
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2
    }]
  }

  const options = {
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: darkMode ? '#94a3b8' : '#64748b', font: { size: 11 } }
      },
      y: {
        display: false,
        beginAtZero: false
      }
    },
    plugins: {
      tooltip: {
        backgroundColor: darkMode ? '#1e293b' : '#fff',
        titleColor: darkMode ? '#f1f5f9' : '#1e293b',
        bodyColor: darkMode ? '#94a3b8' : '#64748b',
        borderColor: darkMode ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        intersect: false,
        mode: 'index',
        callbacks: {
          label: (ctx) => ` R$ ${ctx.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }

  return (
    <div className="h-44">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  )
}

// Mini sparkline for cards
export function Sparkline({ data, color = '#f97316', height = 40 }) {
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{
      data,
      borderColor: color,
      borderWidth: 1.5,
      fill: false,
      tension: 0.4,
      pointRadius: 0
    }]
  }

  const options = {
    scales: { x: { display: false }, y: { display: false } },
    plugins: { tooltip: { enabled: false } },
    interaction: { intersect: false }
  }

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
