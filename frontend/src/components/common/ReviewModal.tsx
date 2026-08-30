import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Booking } from '../../types';
import { useHotel } from '../../context/HotelContext';
import { useToast } from '../ui/Toast';
import { Star, Sparkles } from 'lucide-react';

interface ReviewModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ booking, isOpen, onClose }) => {
  const { submitReview } = useHotel();
  const { success, error } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      error('Review Required', 'Please share a few words about your stay experience.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReview(booking.id, rating, comment.trim());
      if (res.success) {
        success('Review Submitted', 'Thank you for your gracious feedback! It has been posted to our verified reviews.');
        onClose();
      } else {
        error('Submission Failed', res.error);
      }
    } catch {
      error('Error', 'Unable to record your review right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif font-bold text-slate-900">
            Share Your Experience
          </h3>
          <p className="text-xs text-slate-500">
            Stay #{booking.voucherCode} • {booking.nights} Nights in {booking.roomCategory} category
          </p>
        </div>

        {/* Rating Stars */}
        <div className="flex flex-col items-center justify-center space-y-2 py-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none cursor-pointer"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    (hoverRating || rating) >= star
                      ? 'text-emerald-500 fill-emerald-500'
                      : 'text-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-emerald-700">
            {rating === 5
              ? 'Exceptional & Impeccable (5/5)'
              : rating === 4
              ? 'Very Good Experience (4/5)'
              : rating === 3
              ? 'Average Stay (3/5)'
              : rating === 2
              ? 'Could be Improved (2/5)'
              : 'Disappointing (1/5)'}
          </span>
        </div>

        {/* Comment Textarea */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Your Verified Review
          </label>
          <textarea
            required
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell future guests about the cuisine, staff hospitality, plantation views, and serene atmosphere..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Submit Verified Review
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
