import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import toast from 'react-hot-toast';

/**
 * Download and save file on mobile device
 * @param {Blob} blob - The file blob to download
 * @param {string} filename - The desired filename
 * @param {string} mimeType - The MIME type of the file
 */
export const downloadFileOnMobile = async (blob, filename, mimeType) => {
  // If running on web, use standard download
  if (!Capacitor.isNativePlatform()) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return;
  }

  try {
    // Convert blob to base64 for mobile
    const base64Data = await blobToBase64(blob);
    
    // Remove data URL prefix if present
    const base64Content = base64Data.split(',')[1] || base64Data;

    // Save to Cache directory first (no permissions needed)
    const savedFile = await Filesystem.writeFile({
      path: filename,
      data: base64Content,
      directory: Directory.Cache
    });

    console.log('File saved to cache:', savedFile.uri);

    // Share the file so user can save it to Downloads or open it
    await Share.share({
      title: 'Save or Open Report',
      text: filename,
      url: savedFile.uri,
      dialogTitle: 'Choose where to save'
    });

  } catch (error) {
    console.error('Error saving file on mobile:', error);
    toast.error('Failed to save file: ' + error.message);
  }
}

/**
 * Check and request storage permissions
 */
const checkAndRequestPermissions = async () => {
  try {
    // For Capacitor Filesystem, permissions are handled automatically
    // when using Documents or Data directories
    // External storage may require explicit permissions
    const result = await Filesystem.checkPermissions();
    
    if (result.publicStorage !== 'granted') {
      const permissionResult = await Filesystem.requestPermissions();
      return permissionResult.publicStorage === 'granted';
    }
    
    return true;
  } catch (error) {
    console.log('Permission check not supported, continuing anyway:', error);
    // If permission check is not supported, assume we have permission
    return true;
  }
};

/**
 * Convert Blob to Base64 string
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Download PDF report (works on both web and mobile)
 * @param {string} url - The API endpoint to fetch the PDF
 * @param {string} filename - The desired filename
 * @param {object} options - Additional options (method, body, etc.)
 */
export const downloadPDFReport = async (url, filename, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();
    await downloadFileOnMobile(blob, filename, 'application/pdf');
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    toast.error('Failed to download PDF report');
    throw error;
  }
};

/**
 * Download Excel report (works on both web and mobile)
 * @param {string} url - The API endpoint to fetch the Excel file
 * @param {string} filename - The desired filename
 * @param {object} options - Additional options (method, body, etc.)
 */
export const downloadExcelReport = async (url, filename, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();
    await downloadFileOnMobile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
  } catch (error) {
    console.error('Error downloading Excel:', error);
    toast.error('Failed to download Excel report');
    throw error;
  }
};

/**
 * Get the directory where files are saved on mobile
 */
export const getDownloadDirectory = () => {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'android') {
      return 'Documents folder (Internal Storage)';
    } else if (Capacitor.getPlatform() === 'ios') {
      return 'Files app > On My iPhone > Documents';
    }
  }
  return 'Downloads folder';
};
