import { VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET } from '@env';
import { ApiResponse } from './apiClient';

export interface UploadImagePayload {
  uri: string;
  fileName?: string | null | undefined;
  mimeType?: string | null | undefined; 
}

const buildUploadFileName = (file: UploadImagePayload) => {
  if (file.fileName?.trim()) {
    return file.fileName.trim();
  }

  const extension = file.mimeType?.split('/')[1] || 'jpg';
  return `image-${Date.now()}.${extension}`;
};

class UploadService {
  async uploadImageToCloudinary(file: UploadImagePayload): Promise<ApiResponse<string>> {
    try {
      const cloudName = VITE_CLOUDINARY_CLOUD_NAME?.trim();
      const uploadPreset = VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

      if (!cloudName || !uploadPreset) {
        return {
          success: false,
          message: 'Thiếu cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường.',
        };
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: buildUploadFileName(file),
        type: file.mimeType || 'image/jpeg',
      } as any);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.secure_url) {
        return {
          success: false,
          message: data?.error?.message || 'Upload ảnh thất bại',
        };
      }

      return {
        success: true,
        data: data.secure_url as string,
        message: 'Upload ảnh thành công',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Upload ảnh thất bại',
      };
    }
  }

  async uploadAudioToCloudinary(file: UploadImagePayload): Promise<ApiResponse<string>> {
    try {
      const cloudName = VITE_CLOUDINARY_CLOUD_NAME?.trim();
      const uploadPreset = VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

      if (!cloudName || !uploadPreset) {
        return {
          success: false,
          message: 'Thiếu cấu hình Cloudinary. Vui lòng kiểm tra biến môi trường.',
        };
      }

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.fileName || `audio-${Date.now()}.mp3`,
        type: file.mimeType || 'audio/mpeg',
      } as any);
      formData.append('upload_preset', uploadPreset);

      // Cloudinary uses the /video/ endpoint for all audio/video files
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.secure_url) {
        return {
          success: false,
          message: data?.error?.message || 'Upload audio thất bại',
        };
      }

      return {
        success: true,
        data: data.secure_url as string,
        message: 'Upload audio thành công',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Upload audio thất bại',
      };
    }
  }
}

export const uploadService = new UploadService();
export default uploadService;