import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export const formatIndianNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN").format(num);
};
