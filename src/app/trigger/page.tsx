'use client'

import { useState } from 'react'
import Nav from '@/components/nav'
import { Play, CheckCircle, AlertTriangle } from 'lucide-react'

export default function TriggerPage() {
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState<'idle' | 'info'>('idle')

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Run <span className="text-[#f97316]">Review</span>
          </h1>
          <p className="text-xs text-[#555]">Trigger an AI review for a specific survey project</p>
        </div>

        <div className="card p-6 mb-6">
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-[2px] text-[#555] block mb-2">
              QuickBase Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              placeholder="e.g. 10471"
              className="w-full max-w-xs"
            />
          </div>

          <button
            onClick={() => setStatus('info')}
            disabled={!projectId}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Play size={14} /> Start Review
          </button>
        </div>

        {status === 'info' && (
          <div className="card p-6 border-[#f97316]/20">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-2">Run from the Mac mini</h3>
                <p className="text-xs text-[#888] mb-3">
                  The review bot runs locally on Jerry&apos;s Mac mini. SSH in and run:
                </p>
                <pre className="bg-[#0a0a0a] text-[#f97316] p-4 rounded-lg text-xs font-mono overflow-x-auto">
{`cd /Users/jerrybotkin/ss-review-bot
source .venv/bin/activate
python -c "
from reviewer import run_review
result = run_review(${projectId || '<PROJECT_ID>'}, upload_to_drive=True, notify=True, vision_enabled=True)
"`}
                </pre>
                <p className="text-xs text-[#555] mt-3">
                  The bot pulls photos from Arrivy, runs vision analysis, generates a report,
                  uploads to Drive, and POSTs results to this dashboard via <code className="text-[#f97316]">/api/reviews</code>.
                </p>

                <div className="mt-4 p-3 bg-[#0a0a0a] rounded-lg">
                  <h4 className="text-[10px] uppercase tracking-[2px] text-[#555] mb-2">Environment Variable Needed</h4>
                  <pre className="text-xs text-[#888] font-mono">
{`export SS_TRAINER_URL=https://survey-review-bot.vercel.app`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card p-6 mt-6">
          <h3 className="text-[10px] uppercase tracking-[2px] text-[#f97316] mb-3">How It Works</h3>
          <div className="space-y-3 text-sm text-[#888]">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-[#f97316] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p>Pull survey data from QuickBase + photos from Arrivy Form API</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-[#f97316] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p>Run Gemini 2.5 Flash vision analysis on every photo (classify, score quality, extract data)</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-[#f97316] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <p>Score completeness against the 22+ required photo checklist</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-[#f97316] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
              <p>Generate annotated images + HTML report → upload to Drive</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-[#f97316] text-black text-xs font-bold flex items-center justify-center flex-shrink-0">5</span>
              <p>Results land on this dashboard for the design team to review + provide feedback</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
