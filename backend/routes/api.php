<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public endpoints
|--------------------------------------------------------------------------
*/

Route::middleware('throttle:login')->group(function (): void {
    Route::post('/login', [LoginController::class, 'login']);
    Route::post('/login/two-factor', [LoginController::class, 'verifyTwoFactor']);
});

Route::middleware('throttle:password-reset')->group(function (): void {
    Route::post('/forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('/reset-password', [PasswordResetController::class, 'reset']);
});

// Signed URL delivered by the verification email.
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware('signed')
    ->name('verification.verify');

/*
|--------------------------------------------------------------------------
| Authenticated endpoints
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function (): void {
    Route::post('/logout', [LoginController::class, 'logout']);
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'send']);

    Route::middleware('throttle:two-factor')->group(function (): void {
        Route::post('/two-factor/enable', [TwoFactorController::class, 'enable']);
        Route::post('/two-factor/confirm', [TwoFactorController::class, 'confirm']);
        Route::delete('/two-factor', [TwoFactorController::class, 'disable']);
    });

    Route::middleware('verified')->group(function (): void {
        Route::get('/users', [UserController::class, 'index'])
            ->middleware('role:admin');
        Route::post('/users', [UserController::class, 'store'])
            ->middleware('role:admin');
        Route::delete('/users/{id}', [UserController::class, 'destroy'])
            ->middleware('role:admin')
            ->whereNumber('id');
    });
});
