<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FALaravel\Facade as Google2FA;

final class TwoFactorController extends Controller
{
    /**
     * Start 2FA enrollment: generate a secret, return it + otpauth QR SVG.
     * The secret is not persisted until confirmed with a valid code.
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $secret = Google2FA::generateSecretKey();

        $user->forceFill([
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt($this->generateRecoveryCodes()),
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json([
            'secret' => $secret,
            'qr_svg' => $this->buildQrSvg($user->email, $secret),
            'recovery_codes' => decrypt($user->two_factor_recovery_codes),
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();
        abort_unless($user !== null, 401);

        if ($user->two_factor_secret === null) {
            throw ValidationException::withMessages([
                'code' => ['Two-factor authentication has not been initialized.'],
            ]);
        }

        if (! Google2FA::verifyKey(decrypt($user->two_factor_secret), $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['The provided code is invalid.'],
            ]);
        }

        $user->forceFill(['two_factor_confirmed_at' => now()])->save();

        return response()->json(['message' => 'Two-factor authentication enabled.']);
    }

    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();
        abort_unless($user !== null, 401);

        if (! password_verify($data['password'], (string) $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'password' => ['The provided password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    /**
     * @return array<int, string>
     */
    private function generateRecoveryCodes(): array
    {
        return array_map(
            fn () => Str::random(10).'-'.Str::random(10),
            range(1, 8),
        );
    }

    private function buildQrSvg(string $accountName, string $secret): string
    {
        $otpauth = Google2FA::getQRCodeUrl(
            config('app.name', 'Axiom'),
            $accountName,
            $secret,
        );

        $renderer = new ImageRenderer(
            new RendererStyle(256),
            new SvgImageBackEnd,
        );

        return (new Writer($renderer))->writeString($otpauth);
    }
}
