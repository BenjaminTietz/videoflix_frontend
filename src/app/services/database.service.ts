import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { VideoModel } from '../models/video.model';
import { firstValueFrom } from 'rxjs';
import { ContinueWatching } from '../models/continue-watching';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private videoUrl = `${environment.baseUrl}/videos/`;
  public videoSubject = new BehaviorSubject<VideoModel[]>([]);
  public videos$ = this.videoSubject.asObservable();

  private videoFavoriteUrl = `${environment.baseUrl}/favorite/`;
  public videoFavoriteSubject = new BehaviorSubject<VideoModel[]>([]);
  public favoriteVideos$ = this.videoFavoriteSubject.asObservable();

  private continueWatchingUrl = `${environment.baseUrl}/continue-watching/`;
  public continueWatchingSubject = new BehaviorSubject<ContinueWatching[]>([]);
  public continueWatchingVideos$ = this.continueWatchingSubject.asObservable();

  public reloadFavoriteVideos: boolean = false;
  public reloadContinueWatchingVideos: boolean = false;
  public isFavCarouselRendered: boolean = false;
  public isContinueWatchingCarouselRendered: boolean = false;

  constructor(private http: HttpClient) {}

  /**
   * Loads all videos from the server and emits them through the `videos$`
   * observable. If the request fails, it emits an empty array.
   */
  public async loadVideos(): Promise<void> {
    this.http
      .get<VideoModel[]>(this.videoUrl)
      .pipe(
        tap((videos) => {
          this.videoSubject.next(videos);
        }),
        catchError((error) => {
          console.error('Error loading videos:', error);
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Returns an observable that emits an array of VideoModel objects.
   */
  public getVideos(): Observable<VideoModel[]> {
    return this.videos$;
  }

  /**
   * Toggles the favorite status of the given video. If the request fails, it
   * does not do anything.
   * @param video The video to toggle.
   */
  async toggleFavourites(video: VideoModel): Promise<void> {
    const body = { video_id: video.id };
    this.reloadFavoriteVideos = true;
    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.videoFavoriteUrl, body)
      );
      await this.loadFavoriteVideos();
    } catch (error) {
      console.error('Request-Error:', error);
    }
  }

  /**
   * Loads the favorite videos of the logged in user.
   * This method requests the favorite videos from the server and stores them in
   * the videoFavoriteSubject. If the request fails, it does not do anything.
   * To force a reload of the favorite videos, set the reloadFavoriteVideos property
   * to true.
   * @returns A promise that resolves when the request has finished.
   */
  public async loadFavoriteVideos(): Promise<void> {
    this.http
      .get<VideoModel[]>(this.videoFavoriteUrl)
      .pipe(
        tap((favoriteVideos) => {
          this.videoFavoriteSubject.next(favoriteVideos);
        }),
        catchError((error) => {
          console.error('Error loading favorite videos:', error);
          return of([]);
        })
      )
      .subscribe({
        complete: () => {
          this.reloadFavoriteVideos = false;
        },
      });
  }

  /**
   * Returns an observable that emits the favorite videos of the logged in user.
   * If the user is not logged in, the observable will emit an empty array.
   * The observable will only emit a new value when the favorite videos have
   * been reloaded from the server.
   * @returns An observable that emits the favorite videos of the logged in user.
   */
  public getFavoriteVideos(): Observable<VideoModel[]> {
    return this.favoriteVideos$;
  }

  /**
   * Loads the videos that the user has saved to continue watching.
   * This method requests the continue watching videos from the server and stores
   * them in the continueWatchingSubject. If the request fails, it does not do
   * anything.
   * To force a reload of the continue watching videos, set the
   * reloadContinueWatchingVideos property to true.
   * @returns A promise that resolves when the request has finished.
   */
  public async loadContinueWatchingVideos(): Promise<void> {
    this.reloadContinueWatchingVideos = true;
    try {
      const continueWatchingVideos = await firstValueFrom(
        this.http.get<ContinueWatching[]>(this.continueWatchingUrl)
      );
      this.continueWatchingSubject.next(continueWatchingVideos);
    } catch (error) {
      console.warn('Error loading continue watching videos:', error);
    } finally {
      this.reloadContinueWatchingVideos = false;
    }
  }

  /**
   * Returns an observable that emits the videos that the user has saved to
   * continue watching. This observable will only emit a new value when the
   * continue watching videos have been reloaded from the server.
   * @returns An observable that emits the videos that the user has saved to
   * continue watching.
   */
  public getContinueWatchingVideos(): Observable<ContinueWatching[]> {
    return this.continueWatchingVideos$;
  }

  /**
   * Saves the given video to the continue watching list with the given played
   * time.
   * @param video The video to save to the continue watching list.
   * @param playedTime The time in seconds that has been played.
   * @returns A promise that resolves when the request has finished.
   */
  async saveVideoToContinueWatching(
    video: VideoModel,
    playedTime: number
  ): Promise<void> {
    const body = { video_id: video.id, timestamp: playedTime };
    try {
      const response = await firstValueFrom(
        this.http.post<any>(this.continueWatchingUrl, body)
      );
    } catch (error) {
      console.warn('Request-Error:', error);
    } finally {
      this.loadContinueWatchingVideos();
    }
  }

  /**
   * Deletes a video from the continue watching list based on the provided video ID.
   * It first checks if the video exists in the list and then sends a DELETE request
   * to the server to remove it. If the video is successfully deleted, it reloads
   * the updated continue watching list. Logs a warning if an error occurs during
   * the process.
   *
   * @param videoId The ID of the video to be deleted from the continue watching list.
   * @returns A promise that resolves when the operation is complete.
   */
  public async deleteVideoFromContinueWatching(videoId: number): Promise<void> {
    const body = { video_id: videoId };

    try {
      const videos = await firstValueFrom(this.continueWatchingVideos$);
      const videoExists = videos.some((video) => video.video.id === videoId);
      if (videoExists) {
        await firstValueFrom(
          this.http.delete<any>(this.continueWatchingUrl, { body: body })
        );
        this.loadContinueWatchingVideos();
      }
    } catch (error) {
      console.warn(
        'Error deleting video from continue watching Videos:',
        error
      );
    }
  }
}
