package com.leagueos.shared.context;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TenantContext — ThreadLocal tenant isolation")
class TenantContextTest {

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("set/get should return the correct tenant UUID")
    void setAndGet_returnCorrectTenantId() {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenantId);

        assertThat(TenantContext.getCurrentTenant()).isEqualTo(tenantId);
    }

    @Test
    @DisplayName("get should return null when no tenant is set")
    void get_returnsNull_whenNoTenantSet() {
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("clear should remove the current tenant")
    void clear_removesTenant() {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant(tenantId);

        TenantContext.clear();

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("overwriting tenant should return the latest value")
    void set_overwritesPreviousValue() {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();

        TenantContext.setCurrentTenant(tenantA);
        TenantContext.setCurrentTenant(tenantB);

        assertThat(TenantContext.getCurrentTenant()).isEqualTo(tenantB);
    }

    @Test
    @DisplayName("two threads should have independent tenant contexts (no cross-contamination)")
    void threadLocal_isolatesBetweenThreads() throws InterruptedException {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();

        CountDownLatch bothThreadsReady = new CountDownLatch(2);
        CountDownLatch bothThreadsChecked = new CountDownLatch(2);

        AtomicReference<UUID> threadATenantSeen = new AtomicReference<>();
        AtomicReference<UUID> threadBTenantSeen = new AtomicReference<>();

        Thread threadA = new Thread(() -> {
            TenantContext.setCurrentTenant(tenantA);
            bothThreadsReady.countDown();
            try {
                bothThreadsReady.await(); // wait for thread B to set its tenant
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            // After both threads set their tenant, read the value
            threadATenantSeen.set(TenantContext.getCurrentTenant());
            TenantContext.clear();
            bothThreadsChecked.countDown();
        });

        Thread threadB = new Thread(() -> {
            TenantContext.setCurrentTenant(tenantB);
            bothThreadsReady.countDown();
            try {
                bothThreadsReady.await(); // wait for thread A to set its tenant
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            // After both threads set their tenant, read the value
            threadBTenantSeen.set(TenantContext.getCurrentTenant());
            TenantContext.clear();
            bothThreadsChecked.countDown();
        });

        threadA.start();
        threadB.start();
        bothThreadsChecked.await();

        // Each thread should only see its own tenant, never the other
        assertThat(threadATenantSeen.get())
                .as("Thread A should see TENANT_A, not TENANT_B")
                .isEqualTo(tenantA);

        assertThat(threadBTenantSeen.get())
                .as("Thread B should see TENANT_B, not TENANT_A")
                .isEqualTo(tenantB);
    }

    @Test
    @DisplayName("child thread should NOT inherit parent's tenant (ThreadLocal, not InheritableThreadLocal)")
    void childThread_doesNotInheritParentTenant() throws InterruptedException {
        UUID parentTenant = UUID.randomUUID();
        TenantContext.setCurrentTenant(parentTenant);

        AtomicReference<UUID> childTenantSeen = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);

        Thread child = new Thread(() -> {
            childTenantSeen.set(TenantContext.getCurrentTenant());
            latch.countDown();
        });
        child.start();
        latch.await();

        assertThat(childTenantSeen.get())
                .as("Child thread should NOT inherit parent's tenant context")
                .isNull();
    }
}
