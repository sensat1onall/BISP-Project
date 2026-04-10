/**
 * Ticket.tsx - The e-ticket page that shows a printable booking confirmation.
 *
 * This page generates a visual e-ticket for a booking, complete with:
 *   - Trip title and booking ID in a branded header
 *   - Trip details (location, date, duration, difficulty)
 *   - Traveler info (name, avatar, booking date)
 *   - Price breakdown
 *   - A QR code that links back to this ticket page for verification
 *   - A print button that triggers the browser's native print dialog
 *
 * The ticket is designed to look like a real travel ticket with a dashed
 * divider and rounded "cutout" circles on the sides (that old-school
 * perforated ticket look).
 *
 * The QR code encodes the full URL of this ticket page, so scanning it
 * on a phone opens the same ticket in the browser. This could be used
 * by guides to verify that a traveler actually has a valid booking.
 *
 * The bookingId comes from the URL params (React Router's useParams).
 * If the booking or trip doesn't exist, it shows a "Ticket Not Found" message.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/format';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, MapPin, Calendar, Clock, Mountain, Users, Printer } from 'lucide-react';

export const Ticket = () => {
    // Get the booking ID from the URL (e.g., /ticket/abc-123)
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const { user, bookings, trips } = useApp();

    // Look up the booking and its associated trip
    const booking = bookings.find(b => b.id === bookingId);
    const trip = booking ? trips.find(t => t.id === booking.tripId) : null;

    // If the booking doesn't exist or the trip was deleted, show an error state
    if (!booking || !trip) {
        return (
            <div className="py-20 text-center">
                <p className="text-xl font-semibold dark:text-white mb-2">Ticket Not Found</p>
                <p className="text-slate-400 text-sm mb-4">This booking does not exist or has been removed.</p>
                <button onClick={() => navigate('/')} className="text-emerald-600 hover:underline text-sm">Go Home</button>
            </div>
        );
    }

    // The full URL of this ticket page - this is what gets encoded in the QR code
    const ticketUrl = `${window.location.origin}/ticket/${bookingId}`;

    return (
        <div className="py-8 px-6">
            {/* Back button - navigates to the previous page in history */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 transition-colors"
            >
                <ArrowLeft size={18} />
                Back
            </button>

            <div className="max-w-lg mx-auto">
                {/* The actual ticket card - styled to look like a physical ticket */}
                <div id="ticket" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">

                    {/* Ticket Header - Green gradient with trip title and booking ID */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">SafarGo E-Ticket</p>
                                <h1 className="text-xl font-bold mt-1">{trip.title}</h1>
                            </div>
                            <div className="text-right">
                                <p className="text-xs opacity-80">Booking ID</p>
                                {/* Show first 8 chars of the UUID in uppercase for readability */}
                                <p className="text-xs font-mono mt-1">{bookingId?.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dashed divider with circular cutouts on each side.
                        This creates the classic "tear-off ticket" look. The circles
                        are positioned half-off the edge and use the page background color
                        to create the illusion of punched holes. */}
                    <div className="relative">
                        <div className="absolute left-0 w-4 h-4 bg-slate-50 dark:bg-slate-900 rounded-full -translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute right-0 w-4 h-4 bg-slate-50 dark:bg-slate-900 rounded-full translate-x-1/2 -translate-y-1/2" />
                        <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-700 mx-6" />
                    </div>

                    {/* Trip Details Grid - Location, date, duration, difficulty */}
                    <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Location</p>
                                    <p className="text-sm font-medium dark:text-white">{trip.location}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Calendar size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Date</p>
                                    <p className="text-sm font-medium dark:text-white">{new Date(trip.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Clock size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Duration</p>
                                    <p className="text-sm font-medium dark:text-white">{trip.durationDays} day{trip.durationDays > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <Mountain size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Difficulty</p>
                                    <p className="text-sm font-medium dark:text-white capitalize">{trip.difficulty}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700" />

                        {/* Traveler Info - Shows who the ticket belongs to */}
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase mb-2">Traveler</p>
                            <div className="flex items-center gap-3">
                                {/* Avatar with fallback to ui-avatars.com if no avatar is set */}
                                <img
                                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff&size=40`}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                    <p className="text-sm font-semibold dark:text-white">{user.name}</p>
                                    <p className="text-xs text-slate-400">Booked on {new Date(booking.bookedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Price section - Shows the ticket price with a green highlight */}
                        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-emerald-600" />
                                <span className="text-sm text-emerald-700 dark:text-emerald-300">1 person</span>
                            </div>
                            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(trip.price)}</span>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700" />

                        {/* QR Code - Encodes the ticket URL for verification.
                            The QR uses the SafarGo brand green color and a transparent background
                            so it looks good on both light and dark themes. "level M" means
                            medium error correction (can handle ~15% damage). */}
                        <div className="flex flex-col items-center py-2">
                            <QRCodeSVG
                                value={ticketUrl}
                                size={140}
                                bgColor="transparent"
                                fgColor="#10b981"
                                level="M"
                            />
                            <p className="text-[10px] text-slate-400 mt-2">Scan to verify ticket</p>
                        </div>
                    </div>

                    {/* Ticket Footer - Simple branding */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 text-center">
                        <p className="text-[10px] text-slate-400">SafarGo — Your Journey Starts Here</p>
                    </div>
                </div>

                {/* Print Button - Uses the browser's native window.print() to open the print dialog.
                    The ticket is designed to look good when printed thanks to the clean card layout. */}
                <div className="mt-4 text-center">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        <Printer size={16} />
                        Print Ticket
                    </button>
                </div>
            </div>
        </div>
    );
};
