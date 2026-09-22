import React, { useState } from "react";
import { Cpu, Play, CheckCircle2, AlertCircle, Database, UploadCloud } from "lucide-react";
import { PipelineSummary } from "../types";
import { formatIndianNumber } from "./chartSetup";

export const PipelineView: React.FC = () => {
  const [workers, setWorkers] = useState<number>(4);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPipeline = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_workers: workers })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Pipeline run failed");
      setSummary(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const syncSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/admin/sync-supabase", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSyncStatus(`Sync Successful: ${json.data.message}`);
      } else {
        setSyncStatus(`Supabase Notice: ${json.error}`);
      }
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message || String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900" id="pipelineHeading">
          Data Ingestion & Supabase Pipeline Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Parallel scraping, ThreadPool normalization, data validation, and Supabase PostgreSQL persistence
        </p>
      </div>

      {/* Control Card */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              Concurrent Thread Pool Dispatcher
            </h2>
            <p className="text-xs text-slate-500">
              Configure concurrent worker threads for regex cleaning, numeric sanitization, and data validation
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
              <label htmlFor="workerSelect" className="font-semibold text-slate-500">WORKERS:</label>
              <select
                id="workerSelect"
                value={workers}
                onChange={e => setWorkers(parseInt(e.target.value, 10))}
                className="bg-transparent font-bold text-blue-600 focus:outline-none"
                disabled={isRunning}
              >
                <option value="2">2 Threads</option>
                <option value="4">4 Threads</option>
                <option value="8">8 Threads</option>
              </select>
            </div>

            <button
              onClick={runPipeline}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Execute Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Supabase Direct Push Card */}
      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Supabase PostgreSQL Database Sync
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Target: <code className="font-mono text-emerald-800">tbicsxqpcgourttmnlqv.supabase.co</code> (public.cities)
            </p>
          </div>
        </div>
        <button
          onClick={syncSupabase}
          disabled={isSyncing}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Syncing to Supabase...
            </>
          ) : (
            <>
              <UploadCloud className="w-3.5 h-3.5" />
              Push Dataset to Supabase
            </>
          )}
        </button>
      </div>

      {syncStatus && (
        <div className={`p-3 rounded-lg text-xs font-medium border ${
          syncStatus.startsWith("Sync Successful")
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}>
          {syncStatus}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 sm:p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Pipeline execution error: {error}</span>
        </div>
      )}

      {/* Execution Results View */}
      {summary && (
        <div className="space-y-4 sm:space-y-6">
          {/* Metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Execution Time
              </span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono">
                {summary.elapsed_seconds}s
              </div>
              <p className="text-[10px] sm:text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Throughput
              </span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono">
                {formatIndianNumber(summary.processing_telemetry.records_per_second)}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Records per second</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Valid Records
              </span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono text-emerald-600">
                {formatIndianNumber(summary.total_valid_cities)}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Validated & retained</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Workers
              </span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-mono text-blue-600">
                {summary.processing_telemetry.distinct_threads_active}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                ThreadPoolExecutor
              </p>
            </div>
          </div>

          {/* Validation Report & Thread Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Validation Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-slate-200">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Data Validation Report</h3>
                <p className="text-xs text-slate-500">Quality audit following Wikipedia table extraction</p>
              </div>
              <div className="p-3.5 sm:p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Rows Evaluated</span>
                  <span className="font-mono font-bold text-slate-900">{summary.validation_report.total_rows}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Valid Cities Retained</span>
                  <span className="font-mono font-bold text-emerald-600">{summary.validation_report.valid_rows}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Invalid Rows Filtered (National Totals/Headers)</span>
                  <span className="font-mono font-bold text-amber-600">{summary.validation_report.invalid_rows}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Duplicate Cities Detected</span>
                  <span className="font-mono font-bold text-slate-700">{summary.validation_report.duplicate_rows}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Missing City / State Fields</span>
                  <span className="font-mono font-bold text-slate-700">0</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600">Suspicious Demographic Outliers</span>
                  <span className="font-mono font-bold text-slate-700">{summary.validation_report.suspicious_records}</span>
                </div>
              </div>
            </div>

            {/* Multithread Worker Architecture */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-slate-200">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">ThreadPool Worker Topology</h3>
                <p className="text-xs text-slate-500">Concurrency execution audit</p>
              </div>
              <div className="p-3.5 sm:p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Concurrency Method</span>
                  <span className="font-mono font-semibold text-blue-600">concurrent.futures.ThreadPoolExecutor</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Configured Workers</span>
                  <span className="font-mono font-bold text-slate-900">{summary.processing_telemetry.workers_configured} threads</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Active Thread Pool Names</span>
                  <div className="flex flex-wrap gap-1 max-w-[200px] sm:max-w-[240px] justify-end">
                    {summary.processing_telemetry.active_thread_names.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-mono text-slate-700 border border-slate-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">CSV Replacement Strategy</span>
                  <span className="font-mono text-xs text-slate-700">Atomic NamedTemporaryFile Swap</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600">Target CSV Destination</span>
                  <span className="font-mono text-xs text-slate-700 truncate max-w-[180px] sm:max-w-[200px]">{summary.csv_path}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explanatory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            1. What is Parallelized
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Individual row string sanitization, regex stripping of citation superscripts (e.g. [1], [a], ‡), comma cleanup from population integers, and format constraint checks.
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            2. Thread Safety Strategy
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Worker tasks are pure functions without shared-state mutation. Database connections are never shared across worker threads; batches are merged and written sequentially.
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
            3. Supabase Upsert Strategy
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Upserts run in batches to prevent payload limits. Unique indexes on (city, state, population_year) prevent duplicate city records across runs.
          </p>
        </div>
      </div>
    </div>
  );
};
