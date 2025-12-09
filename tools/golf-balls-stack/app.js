/**
 * Golf Balls Stack - Interactive Physics Simulation
 * Stack golf balls using realistic physics powered by Matter.js
 */

// ============================================================================
// Constants and Configuration
// ============================================================================

const CONFIG = {
    // Golf ball properties
    BALL_RADIUS: 21.35, // Standard golf ball radius in pixels (42.7mm diameter)
    BALL_MASS: 0.0459, // Golf ball mass in kg
    BALL_RESTITUTION: 0.65, // Bounce coefficient (normal mode)
    BALL_FRICTION: 0.3, // Surface friction (normal mode)
    BALL_FRICTION_AIR: 0.01, // Air resistance
    
    // Record mode properties (more realistic, harder to stack)
    RECORD_RESTITUTION: 0.55, // Less bounce in record mode
    RECORD_FRICTION: 0.5, // More friction in record mode
    RECORD_FRICTION_STATIC: 0.6, // Higher static friction
    
    // World properties
    GRAVITY: 1.0,
    WALL_THICKNESS: 60,
    GROUND_FRICTION: 0.8,
    GROUND_RESTITUTION: 0.4,
    
    // Stacking detection
    STACK_VELOCITY_THRESHOLD: 0.5, // Max velocity for "stable"
    STACK_CHECK_INTERVAL: 500, // Check every 500ms
    VERTICAL_TOLERANCE: 50, // Horizontal distance to be "stacked"
    
    // Spawn position
    SPAWN_OFFSET_X: 0.3, // 30% from left
    SPAWN_OFFSET_Y: 0.15, // 15% from top
    
    // Visual
    DIMPLE_COUNT: 336, // Standard golf ball has ~300-500 dimples
    SHADOW_OFFSET: 3,
    SHADOW_BLUR: 8
};

// ============================================================================
// Global State
// ============================================================================

let engine, render, world, canvas, ctx;
let balls = [];
let currentHeight = 0;
let totalBalls = 0;
let recordMode = false;
let isDragging = false;
let draggedBall = null;
let mouseConstraint = null;

// ============================================================================
// PhysicsEngine Module
// Handles Matter.js setup and physics simulation
// ============================================================================

const PhysicsEngine = {
    /**
     * Initialize the physics engine and renderer
     */
    init() {
        const container = document.getElementById('game-container');
        canvas = document.getElementById('game-canvas');
        
        // Set canvas size
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Create Matter.js engine
        engine = Matter.Engine.create();
        world = engine.world;
        world.gravity.y = CONFIG.GRAVITY;
        
        // Create boundaries (walls, ceiling, floor)
        this.createBoundaries();
        
        // Create custom renderer using canvas 2D
        ctx = canvas.getContext('2d');
        
        // Set up mouse/touch interaction
        this.setupMouseControl();
        
        // Start the physics loop
        this.startLoop();
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    },
    
    /**
     * Create walls and floor
     */
    createBoundaries() {
        const width = canvas.width;
        const height = canvas.height;
        const thickness = CONFIG.WALL_THICKNESS;
        
        const commonOptions = {
            isStatic: true,
            friction: CONFIG.GROUND_FRICTION,
            restitution: CONFIG.GROUND_RESTITUTION,
            render: { fillStyle: 'transparent' }
        };
        
        // Floor
        const floor = Matter.Bodies.rectangle(
            width / 2,
            height - thickness / 2,
            width,
            thickness,
            commonOptions
        );
        
        // Left wall
        const leftWall = Matter.Bodies.rectangle(
            thickness / 2,
            height / 2,
            thickness,
            height,
            commonOptions
        );
        
        // Right wall
        const rightWall = Matter.Bodies.rectangle(
            width - thickness / 2,
            height / 2,
            thickness,
            height,
            commonOptions
        );
        
        Matter.World.add(world, [floor, leftWall, rightWall]);
    },
    
    /**
     * Set up mouse/touch controls for dragging balls
     */
    setupMouseControl() {
        const mouse = Matter.Mouse.create(canvas);
        mouseConstraint = Matter.MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });
        
        Matter.World.add(world, mouseConstraint);
        
        // Track dragging state
        Matter.Events.on(mouseConstraint, 'startdrag', (event) => {
            isDragging = true;
            draggedBall = event.body;
        });
        
        Matter.Events.on(mouseConstraint, 'enddrag', () => {
            isDragging = false;
            draggedBall = null;
        });
        
        // Prevent canvas from blocking pointer events
        canvas.style.touchAction = 'none';
    },
    
    /**
     * Start the physics and render loop
     */
    startLoop() {
        const loop = () => {
            Matter.Engine.update(engine, 1000 / 60);
            this.render();
            requestAnimationFrame(loop);
        };
        loop();
    },
    
    /**
     * Custom render function for golf balls with dimples and shadows
     */
    render() {
        // Clear canvas with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#e8f4f8');
        gradient.addColorStop(0.5, '#f0f9ff');
        gradient.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw ground line
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - CONFIG.WALL_THICKNESS);
        ctx.lineTo(canvas.width, canvas.height - CONFIG.WALL_THICKNESS);
        ctx.stroke();
        
        // Draw all golf balls
        balls.forEach(ball => {
            GolfBall.render(ball);
        });
    },
    
    /**
     * Handle window resize
     */
    handleResize() {
        const container = document.getElementById('game-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Remove old boundaries and recreate
        const bodiesToRemove = Matter.Composite.allBodies(world).filter(b => b.isStatic);
        Matter.World.remove(world, bodiesToRemove);
        this.createBoundaries();
    }
};

// ============================================================================
// GolfBall Module
// Handles golf ball creation and rendering with dimple texture
// ============================================================================

const GolfBall = {
    /**
     * Create a new golf ball
     */
    create(x, y) {
        const ball = Matter.Bodies.circle(x, y, CONFIG.BALL_RADIUS, {
            restitution: recordMode ? CONFIG.RECORD_RESTITUTION : CONFIG.BALL_RESTITUTION,
            friction: recordMode ? CONFIG.RECORD_FRICTION : CONFIG.BALL_FRICTION,
            frictionAir: CONFIG.BALL_FRICTION_AIR,
            frictionStatic: recordMode ? CONFIG.RECORD_FRICTION_STATIC : CONFIG.BALL_FRICTION,
            density: CONFIG.BALL_MASS / (Math.PI * CONFIG.BALL_RADIUS * CONFIG.BALL_RADIUS),
            render: { fillStyle: '#ffffff' }
        });
        
        balls.push(ball);
        Matter.World.add(world, ball);
        totalBalls++;
        StackingUI.updateStats();
        
        // Play spawn sound (stub)
        SoundEffects.spawn();
        
        return ball;
    },
    
    /**
     * Render a golf ball with dimples and shadow
     */
    render(ball) {
        const pos = ball.position;
        const radius = CONFIG.BALL_RADIUS;
        
        // Draw shadow
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(
            pos.x + CONFIG.SHADOW_OFFSET,
            pos.y + CONFIG.SHADOW_OFFSET,
            radius,
            radius * 0.3,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
        
        // Draw ball base with gradient
        const gradient = ctx.createRadialGradient(
            pos.x - radius * 0.3,
            pos.y - radius * 0.3,
            0,
            pos.x,
            pos.y,
            radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#e2e8f0');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw dimples (simplified pattern)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        const dimpleRadius = radius * 0.08;
        const dimpleSpacing = radius * 0.25;
        
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const distance = radius * 0.6;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(pos.x + dx, pos.y + dy, dimpleRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Inner ring of dimples
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + 0.2;
            const distance = radius * 0.35;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(pos.x + dx, pos.y + dy, dimpleRadius * 0.9, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ball outline
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    },
    
    /**
     * Remove all balls from the world
     */
    removeAll() {
        balls.forEach(ball => {
            Matter.World.remove(world, ball);
        });
        balls = [];
        totalBalls = 0;
        currentHeight = 0;
        StackingUI.updateStats();
    }
};

// ============================================================================
// TowerCounter Module
// Tracks stable vertical stacking height
// ============================================================================

const TowerCounter = {
    lastCheckTime: 0,
    
    /**
     * Calculate current stable tower height
     */
    calculateHeight() {
        const now = Date.now();
        if (now - this.lastCheckTime < CONFIG.STACK_CHECK_INTERVAL) {
            return currentHeight;
        }
        this.lastCheckTime = now;
        
        if (balls.length === 0) {
            currentHeight = 0;
            return 0;
        }
        
        // Find stable balls (low velocity)
        const stableBalls = balls.filter(ball => {
            const velocity = Math.sqrt(
                ball.velocity.x * ball.velocity.x + 
                ball.velocity.y * ball.velocity.y
            );
            return velocity < CONFIG.STACK_VELOCITY_THRESHOLD;
        });
        
        if (stableBalls.length === 0) {
            currentHeight = 0;
            return 0;
        }
        
        // Sort by Y position (top to bottom)
        const sorted = stableBalls.sort((a, b) => a.position.y - b.position.y);
        
        // Find the tallest continuous vertical stack
        let maxStack = 1;
        let currentStack = 1;
        
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            
            // Check if horizontally aligned (within tolerance)
            const horizontalDist = Math.abs(curr.position.x - prev.position.x);
            const verticalDist = curr.position.y - prev.position.y;
            
            // Should be roughly one ball diameter apart vertically
            const expectedDist = CONFIG.BALL_RADIUS * 2;
            const distTolerance = CONFIG.BALL_RADIUS * 0.5;
            
            if (horizontalDist < CONFIG.VERTICAL_TOLERANCE &&
                verticalDist > expectedDist - distTolerance &&
                verticalDist < expectedDist + distTolerance) {
                currentStack++;
                maxStack = Math.max(maxStack, currentStack);
            } else {
                currentStack = 1;
            }
        }
        
        currentHeight = maxStack;
        return maxStack;
    }
};

// ============================================================================
// StackingUI Module
// Manages UI overlay and user interactions
// ============================================================================

const StackingUI = {
    elements: {},
    
    /**
     * Initialize UI elements and event listeners
     */
    init() {
        // Cache DOM elements
        this.elements = {
            currentHeight: document.getElementById('current-height'),
            totalBalls: document.getElementById('total-balls'),
            spawnButton: document.getElementById('spawn-ball'),
            resetButton: document.getElementById('reset-game'),
            recordModeToggle: document.getElementById('record-mode')
        };
        
        // Set up event listeners
        this.elements.spawnButton.addEventListener('click', () => this.spawnBall());
        this.elements.resetButton.addEventListener('click', () => this.resetGame());
        this.elements.recordModeToggle.addEventListener('change', (e) => {
            recordMode = e.target.checked;
            SoundEffects.toggle();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.spawnBall();
            }
        });
        
        // Start stats update loop
        setInterval(() => this.updateStats(), CONFIG.STACK_CHECK_INTERVAL);
    },
    
    /**
     * Spawn a new golf ball
     */
    spawnBall() {
        const x = canvas.width * CONFIG.SPAWN_OFFSET_X;
        const y = canvas.height * CONFIG.SPAWN_OFFSET_Y;
        GolfBall.create(x, y);
    },
    
    /**
     * Reset the game
     */
    resetGame() {
        GolfBall.removeAll();
        SoundEffects.reset();
    },
    
    /**
     * Update stats display
     */
    updateStats() {
        const height = TowerCounter.calculateHeight();
        this.elements.currentHeight.textContent = height;
        this.elements.totalBalls.textContent = totalBalls;
        
        // Highlight if record is matched or beaten
        if (height >= 9) {
            this.elements.currentHeight.style.color = '#f59e0b';
            this.elements.currentHeight.style.fontWeight = '800';
        } else {
            this.elements.currentHeight.style.color = '#1e293b';
            this.elements.currentHeight.style.fontWeight = '700';
        }
    }
};

// ============================================================================
// SoundEffects Module
// Stub functions for future sound implementation
// ============================================================================

const SoundEffects = {
    /**
     * Play ball collision sound
     * TODO: Implement Web Audio API sound
     */
    collision(intensity) {
        // Stub - future implementation
        // Could use Web Audio API to generate collision sounds
        // based on intensity of impact
    },
    
    /**
     * Play ball spawn sound
     */
    spawn() {
        // Stub - future implementation
    },
    
    /**
     * Play toggle sound
     */
    toggle() {
        // Stub - future implementation
    },
    
    /**
     * Play reset sound
     */
    reset() {
        // Stub - future implementation
    }
};

// ============================================================================
// Collision Detection for Sound Effects
// ============================================================================

/**
 * Set up collision event listeners
 * Hook for future sound effects based on collision intensity
 */
function setupCollisionDetection() {
    Matter.Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
            // Calculate collision intensity
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (!bodyA.isStatic && !bodyB.isStatic) {
                const relativeVelocity = Math.sqrt(
                    Math.pow(bodyA.velocity.x - bodyB.velocity.x, 2) +
                    Math.pow(bodyA.velocity.y - bodyB.velocity.y, 2)
                );
                
                // Play sound if collision is significant
                if (relativeVelocity > 2) {
                    SoundEffects.collision(relativeVelocity);
                }
            }
        });
    });
}

// ============================================================================
// Application Initialization
// ============================================================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    PhysicsEngine.init();
    StackingUI.init();
    setupCollisionDetection();
    
    console.log('🏌️ Golf Balls Stack initialized!');
    console.log('📦 Matter.js version:', Matter.version);
});
