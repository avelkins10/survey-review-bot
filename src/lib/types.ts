export interface Survey {
  id: number
  qb_record_id: number
  customer_name: string
  state: string | null
  survey_status: string
  arrivy_task_id: string | null
  drive_link: string | null
  survey_submitted_date: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: number
  survey_id: number | null
  qb_record_id: number
  customer_name: string
  state: string | null
  review_date: string
  disposition: 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT'
  completeness_score: number
  overall_confidence: number
  total_photos: number
  missing_categories: string[]
  quality_flags: string[]
  action_items: string[]
  extracted_data: Record<string, any>
  drive_folder_url: string | null
  error: string | null
  created_at: string
}

export interface PhotoResult {
  id: number
  review_id: number
  category_key: string
  arrivy_label: string | null
  photo_index: number
  file_size_kb: number | null
  quality_score: number | null
  confirmed: boolean
  design_ready: boolean
  issues: string[]
  extracted_data: Record<string, any>
  vision_skipped: boolean
  photo_url: string | null
  created_at: string
}

export interface Feedback {
  id: number
  review_id: number
  reviewer_name: string | null
  human_disposition: string | null
  confidence_rating: number | null
  ai_caught: string | null
  human_caught: string | null
  patterns: string | null
  per_photo: Record<string, any>
  created_at: string
}

export type DispositionType = 'APPROVE' | 'FLAG_FOR_REVIEW' | 'REJECT'

export const DISPOSITION_CONFIG: Record<DispositionType, { color: string; bg: string; emoji: string; label: string }> = {
  APPROVE: { color: '#22c55e', bg: '#14532d', emoji: '✅', label: 'Approved' },
  FLAG_FOR_REVIEW: { color: '#f59e0b', bg: '#92400e', emoji: '⚠️', label: 'Needs Review' },
  REJECT: { color: '#ef4444', bg: '#991b1b', emoji: '❌', label: 'Rejected' },
}
