import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, retry, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Base64ConvertionService {
  protected http: HttpClient = inject(HttpClient);
  constructor() { }

  // Convert a single URL (image or PDF) to a base64 data URL.
  // If the URL path ends with .pdf (case-insensitive), return with application/pdf header.
  // Otherwise, return with image/* header, preferring the blob's mime when available.
  public imageUrlToBase64(url: string): Promise<string | undefined> {
    return this.http
      .get(url, {
        observe: 'body',
        responseType: 'arraybuffer',
      })
      .pipe(
        take(1),
        retry(4),
        map((arrayBuffer) =>
          btoa(
            Array.from(new Uint8Array(arrayBuffer))
              .map((b) => String.fromCharCode(b))
              .join('')
          )
        )
      )
      .toPromise(); 
  }


  // Helper to convert Blob to base64 string (no data URL header)
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.onload = () => {
        const result = reader.result as string;
        // result is a data URL, extract base64 after the comma
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.readAsDataURL(blob);
    });
  }
}
