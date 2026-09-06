<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Clear the permission cache between tests so role checks don't
        // return stale results from the previous test's roles.
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
