import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from 'axios'
import { getApiUrl } from './env'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para converter URLs de vídeo para formato embed
export const getVideoEmbedUrl = (url: string): string => {
  if (!url) return '';
  
  // YouTube
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  
  // YouTube short
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  
  // Vimeo
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }
  
  // Se já é uma URL embed, retorna como está
  if (url.includes('/embed/')) {
    return url;
  }
  
  return url;
};

export const API_URL = getApiUrl();

export async function fetchCourseDetail(courseId: string) {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}
