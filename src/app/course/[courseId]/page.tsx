"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import Header from "../../../components/layout/Header";
import { apiCall } from "../../../lib/api";
import {
  getCourseProgress,
  updateCourseProgress,
} from "../../api/course/[courseId]/progress/progress";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useAuth } from "../../../hooks/AuthContext";

// --- Interfaces ---
interface Video {
  videoId: string;
  title: string;
  description?: string;
  thumbnail: string;
  position: number;
  duration?: string;
}

interface Course {
  _id: string;
  title: string;
  playlistId: string;
  description: string;
  videos: Video[];
  createdAt: string;
}

interface ProgressHistory {
  videoId: string;
  videoTitle: string;
  completedAt: string;
  position: number;
}

// --- Components ---

// Modern Circular Progress
const ModernCircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ percentage, size = 60, strokeWidth = 6, color = "#3b82f6" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

// Duration formatter
const formatDuration = (duration?: string): string => {
  if (!duration) return "";
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

// --- Main Page Component ---
const CoursePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { logout } = useAuth();
  const courseId = params?.courseId as string;

  // State
  const [course, setCourse] = useState<Course | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Player State
  const [playerReady, setPlayerReady] = useState(false);
  const [autoplay, setAutoplay] = useState(true); // Default true
  const [player, setPlayer] = useState<any>(null);

  // History State
  const [progressHistory, setProgressHistory] = useState<ProgressHistory[]>([]);
  const [showProgressHistory, setShowProgressHistory] = useState(false);

  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Auth Check
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
      if (!user) {
        toast.error("Please log in to view this course");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Course & Progress
  useEffect(() => {
    const fetchCourse = async () => {
      if (!authReady || !courseId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch Course Data
        const data = await apiCall(`/course/${courseId}`);
        if (!data || !data.videos || !Array.isArray(data.videos)) {
          throw new Error("Invalid course data received");
        }
        setCourse(data);
        setStartDate(
          new Date(data.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );

        // Fetch Progress
        try {
          const { progress, currentVideoId, completedVideoIds } = await getCourseProgress(courseId);

          // Handle completed videos (support both array and calculated)
          let completedIds: string[] = [];
          if (completedVideoIds && Array.isArray(completedVideoIds)) {
            completedIds = completedVideoIds;
          } else if (progress > 0) {
            // Fallback for old data format
            const count = Math.round((progress / 100) * data.videos.length);
            completedIds = data.videos.slice(0, count).map((v: Video) => v.videoId);
          }
          setCompletedVideos(completedIds);

          // Set current video
          const initial = data.videos.find((v: Video) => v.videoId === currentVideoId) || data.videos[0];
          setCurrentVideo(initial);
          setProgressLoaded(true);
        } catch (err) {
          console.info("No progress found, starting fresh.", err);
          setCurrentVideo(data.videos[0]);
          setCompletedVideos([]);
          setProgressLoaded(true);
        }

      } catch (err: any) {
        console.error("Error loading course:", err);
        setError(err.message || "Failed to load course");
        toast.error("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, authReady]);

  // Calculated Progress
  const progressPercent = useMemo(() => {
    if (!course || course.videos.length === 0) return 0;
    return Math.round((completedVideos.length / course.videos.length) * 100);
  }, [completedVideos, course]);

  // 3. Auto-Save Progress
  useEffect(() => {
    if (!course || !progressLoaded) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      const body = {
        progress: progressPercent,
        currentVideoId: currentVideo?.videoId,
        completedVideoIds: completedVideos,
      };

      updateCourseProgress(course._id, body).catch(err =>
        console.error("Failed to auto-save progress:", err)
      );
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [progressPercent, currentVideo?.videoId, completedVideos, course, progressLoaded]);

  // 4. YouTube API Init
  useEffect(() => {
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.id = "youtube-iframe-api";
      document.body.appendChild(tag);
    }

    const onYouTubeIframeAPIReady = () => setPlayerReady(true);
    (window as any).onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

    if ((window as any).YT && (window as any).YT.Player) {
      setPlayerReady(true);
    }

    return () => {
      (window as any).onYouTubeIframeAPIReady = undefined;
    };
  }, []);

  // 5. Player Logic
  useEffect(() => {
    if (!playerReady || !currentVideo) return;

    const initPlayer = () => {
      if (player) {
        player.loadVideoById(currentVideo.videoId);
        return;
      }

      const newPlayer = new (window as any).YT.Player("yt-player", {
        videoId: currentVideo.videoId,
        playerVars: {
          autoplay: 1, // Auto-start the video when loaded
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onStateChange: (event: any) => {
            // ENDED state
            if (event.data === 0) {
              handleVideoEnd();
            }
          },
        },
      });
      setPlayer(newPlayer);
    };

    initPlayer();
  }, [playerReady, currentVideo]); // Re-run when currentVideo changes to load new ID

  // Handle Video End
  const handleVideoEnd = () => {
    if (!currentVideo) return;

    // Mark complete
    if (!completedVideos.includes(currentVideo.videoId)) {
      setCompletedVideos(prev => [...prev, currentVideo.videoId]);
      updateProgressHistory(currentVideo);
    }

    // Autoplay next
    if (autoplay) {
      setTimeout(() => handleNextVideo(), 1500);
    }
  };

  // Navigation Handlers
  const currentVideoIndex = useMemo(() => {
    if (!course || !currentVideo) return -1;
    return course.videos.findIndex(v => v.videoId === currentVideo.videoId);
  }, [course, currentVideo]);

  const handleNextVideo = () => {
    if (!course || currentVideoIndex === -1) return;
    if (currentVideoIndex < course.videos.length - 1) {
      setCurrentVideo(course.videos[currentVideoIndex + 1]);
    }
  };

  const handlePrevVideo = () => {
    if (!course || currentVideoIndex === -1) return;
    if (currentVideoIndex > 0) {
      setCurrentVideo(course.videos[currentVideoIndex - 1]);
    }
  };

  const toggleCompleted = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    setCompletedVideos(prev => {
      if (prev.includes(videoId)) return prev.filter(id => id !== videoId);
      return [...prev, videoId];
    });
  };

  const updateProgressHistory = (video: Video) => {
    setProgressHistory(prev => [
      {
        videoId: video.videoId,
        videoTitle: video.title,
        completedAt: new Date().toISOString(),
        position: video.position,
      },
      ...prev
    ]);
  };

  // Scroll to active video
  const activeVideoRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeVideoRef.current && listContainerRef.current) {
      const container = listContainerRef.current;
      const item = activeVideoRef.current;

      // Calculate position to center the item within the container
      // offsetTop is relative to the container because we'll add 'relative' to it
      const itemTop = item.offsetTop;
      const itemHeight = item.clientHeight;
      const containerHeight = container.clientHeight;

      const scrollTo = itemTop - (containerHeight / 2) + (itemHeight / 2);

      container.scrollTo({
        top: scrollTo,
        behavior: "smooth"
      });
    }
  }, [currentVideo]);

  // --- Render Helpers ---
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!authReady) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Please log in...</div>;
  if (error || !course) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">{error || "Course not found"}</div>;

  const canGoPrev = currentVideoIndex > 0;
  const canGoNext = currentVideoIndex < course.videos.length - 1;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 font-sans">

        {/* --- Hero Header (Compacted) --- */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white pb-12 pt-6 px-4 lg:px-8 shadow-lg relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/30 text-[10px] font-medium backdrop-blur-sm">
                  <span>Course</span>
                  <span className="w-1 h-1 rounded-full bg-blue-200"></span>
                  <span>{course.videos.length} Videos</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold leading-tight text-white shadow-sm">
                  {course.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-blue-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span>{course.description || "Instructor"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>Started {startDate}</span>
                  </div>
                </div>
              </div>

              {/* Progress Card in Header (Compacted) */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-inner">
                <ModernCircularProgress percentage={progressPercent} size={48} strokeWidth={4} color="#4ade80" />
                <div>
                  <div className="text-xl font-bold text-white">{progressPercent}%</div>
                  <div className="text-[10px] text-blue-200 uppercase tracking-wider font-medium">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Main Content Grid --- */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 -mt-6 pb-12 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Player & Controls (2/3 width) */}
            <div className="lg:col-span-2 space-y-4">

              {/* Video Player Card */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 ring-1 ring-black/5">
                <div className="aspect-video bg-black relative group">
                  <div id="yt-player" className="w-full h-full"></div>
                </div>

                {/* Controls Bar */}
                <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handlePrevVideo}
                      disabled={!canGoPrev}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${canGoPrev
                        ? "bg-white text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Prev
                    </button>
                    <button
                      onClick={handleNextVideo}
                      disabled={!canGoNext}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${canGoNext
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg active:scale-95"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-xs font-medium text-gray-500">
                      Video <span className="text-gray-900">{currentVideoIndex + 1}</span> / <span className="text-gray-900">{course.videos.length}</span>
                    </div>
                    <div className="h-4 w-px bg-gray-200 mx-1"></div>
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                      <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Autoplay</span>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={autoplay} onChange={() => setAutoplay(!autoplay)} />
                        <div className={`w-9 h-5 rounded-full transition-colors duration-300 ${autoplay ? "bg-blue-600" : "bg-gray-300"}`}></div>
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${autoplay ? "translate-x-4" : "translate-x-0"}`}></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Current Video Info */}
              {currentVideo && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 leading-snug">
                    {currentVideo.position}. {currentVideo.title}
                  </h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {currentVideo.description || "No description available."}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Video List (1/3 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[500px] lg:h-[calc(100vh-100px)] sticky top-4">

                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Course Content</h3>
                  <span className="text-xs text-gray-500">{completedVideos.length} / {course.videos.length} completed</span>
                </div>

                {/* List Content */}
                <div ref={listContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-gray-50/30 relative">
                  {course.videos.map((video) => {
                    const isActive = currentVideo?.videoId === video.videoId;
                    const isCompleted = completedVideos.includes(video.videoId);

                    return (
                      <div
                        key={video.videoId}
                        ref={isActive ? activeVideoRef : null}
                        onClick={() => setCurrentVideo(video)}
                        className={`group flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${isActive
                          ? "bg-blue-50 border-blue-200 shadow-sm"
                          : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50"
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          <div className="relative flex-shrink-0 w-28 aspect-video rounded overflow-hidden bg-gray-200 shadow-sm">
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-[10px]">No Img</div>
                            )}
                            {isActive && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                                  <div className="w-0 h-0 border-t-3 border-t-transparent border-l-6 border-l-blue-600 border-b-3 border-b-transparent ml-0.5"></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-semibold leading-snug line-clamp-2 mb-1 ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                              <span className="mr-1 opacity-60 font-normal">#{video.position}</span>
                              {video.title}
                            </h3>
                            <div className="text-xs text-gray-500">
                              {video.duration ? formatDuration(video.duration) : "00:00"}
                            </div>
                          </div>
                        </div>

                        {/* Action Bar (Button) */}
                        <div className="flex items-center justify-end pt-1 border-t border-gray-100/50 mt-1">
                          <button
                            onClick={(e) => toggleCompleted(e, video.videoId)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${isCompleted
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                              }`}
                          >
                            {isCompleted ? (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                COMPLETED
                              </>
                            ) : (
                              <>
                                <span className="w-3 h-3 rounded-full border-2 border-current opacity-40"></span>
                                MARK COMPLETE
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default CoursePage;
