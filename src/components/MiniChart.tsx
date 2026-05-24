import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, AreaSeries } from 'lightweight-charts';

interface ChartPoint {
  t: number; // Unix timestamp
  p: number; // Price
}

interface MiniChartProps {
  data: ChartPoint[];
  theme?: 'dark' | 'light';
  change?: number; // Used to color the line/gradient
}

export const MiniChart: React.FC<MiniChartProps> = ({ data, theme = 'dark', change = 0 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 100,
      layout: {
        background: { color: 'transparent' },
        textColor: theme === 'dark' ? '#a0a0a0' : '#555555',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        visible: false, // Hide price scale on the right for clean mini chart
      },
      timeScale: {
        visible: false, // Hide time scale at the bottom
      },
      handleScale: false,
      handleScroll: false,
    });

    // We use Area series for a sleek gradient chart
    const isUp = change >= 0;
    const lineColor = isUp ? '#26a69a' : '#ef5350';
    const topColor = isUp ? 'rgba(38, 166, 154, 0.2)' : 'rgba(239, 83, 80, 0.2)';
    const bottomColor = isUp ? 'rgba(38, 166, 154, 0.0)' : 'rgba(239, 83, 80, 0.0)';

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: lineColor,
      topColor: topColor,
      bottomColor: bottomColor,
      lineWidth: 2,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.resize(chartContainerRef.current.clientWidth, 100);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [theme, change]); // Re-create chart if theme or change direction changes

  // Update data points
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || data.length === 0) return;

    // Format data for Lightweight Charts (requires time as UTCTimestamp and sorted ascending)
    const formattedData = data
      .map(point => ({
        time: point.t as UTCTimestamp,
        value: point.p,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    // Remove duplicates by time (Lightweight Charts throws error on duplicate time)
    const uniqueData = formattedData.filter((item, index, self) =>
      index === self.findIndex(t => t.time === item.time)
    );

    seriesRef.current.setData(uniqueData);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '100px', position: 'relative' }} />;
};
