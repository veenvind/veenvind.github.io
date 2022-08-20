function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function validate_store(store, name) {
    if (store != null && typeof store.subscribe !== 'function') {
        throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    }
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead
let crossorigin;
function is_crossorigin() {
    if (crossorigin === undefined) {
        crossorigin = false;
        try {
            if (typeof window !== 'undefined' && window.parent) {
                void window.parent.document;
            }
        }
        catch (error) {
            crossorigin = true;
        }
    }
    return crossorigin;
}
function add_resize_listener(node, fn) {
    const computed_style = getComputedStyle(node);
    if (computed_style.position === 'static') {
        node.style.position = 'relative';
    }
    const iframe = element('iframe');
    iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
        'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    const crossorigin = is_crossorigin();
    let unsubscribe;
    if (crossorigin) {
        iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
        unsubscribe = listen(window, 'message', (event) => {
            if (event.source === iframe.contentWindow)
                fn();
        });
    }
    else {
        iframe.src = 'about:blank';
        iframe.onload = () => {
            unsubscribe = listen(iframe.contentWindow, 'resize', fn);
        };
    }
    append(node, iframe);
    return () => {
        if (crossorigin) {
            unsubscribe();
        }
        else if (unsubscribe && iframe.contentWindow) {
            unsubscribe();
        }
        detach(iframe);
    };
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { stylesheet } = info;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            info.rules = {};
        });
        managed_styles.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
    return context;
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_in_transition(node, fn, params) {
    let config = fn(node, params);
    let running = false;
    let animation_name;
    let task;
    let uid = 0;
    function cleanup() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
        tick(0, 1);
        const start_time = now() + delay;
        const end_time = start_time + duration;
        if (task)
            task.abort();
        running = true;
        add_render_callback(() => dispatch(node, true, 'start'));
        task = loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(1, 0);
                    dispatch(node, true, 'end');
                    cleanup();
                    return running = false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(t, 1 - t);
                }
            }
            return running;
        });
    }
    let started = false;
    return {
        start() {
            if (started)
                return;
            started = true;
            delete_rule(node);
            if (is_function(config)) {
                config = config();
                wait().then(go);
            }
            else {
                go();
            }
        },
        invalidate() {
            started = false;
        },
        end() {
            if (running) {
                cleanup();
                running = false;
            }
        }
    };
}
function create_out_transition(node, fn, params) {
    let config = fn(node, params);
    let running = true;
    let animation_name;
    const group = outros;
    group.r += 1;
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
        const start_time = now() + delay;
        const end_time = start_time + duration;
        add_render_callback(() => dispatch(node, false, 'start'));
        loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(0, 1);
                    dispatch(node, false, 'end');
                    if (!--group.r) {
                        // this will result in `end()` being called,
                        // so we don't need to clean up here
                        run_all(group.c);
                    }
                    return false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(1 - t, t);
                }
            }
            return running;
        });
    }
    if (is_function(config)) {
        wait().then(() => {
            // @ts-ignore
            config = config();
            go();
        });
    }
    else {
        go();
    }
    return {
        end(reset) {
            if (reset && config.tick) {
                config.tick(1, 0);
            }
            if (running) {
                if (animation_name)
                    delete_rule(node, animation_name);
                running = false;
            }
        }
    };
}
function create_bidirectional_transition(node, fn, params, intro) {
    let config = fn(node, params);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = (program.b - t);
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        const program = {
            start: now() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program || pending_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config();
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);

function destroy_block(block, lookup) {
    block.d(1);
    lookup.delete(block.key);
}
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            block.p(child_ctx, dirty);
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    return new_blocks;
}
function validate_each_keys(ctx, list, get_context, get_key) {
    const keys = new Set();
    for (let i = 0; i < list.length; i++) {
        const key = get_key(get_context(ctx, list, i));
        if (keys.has(key)) {
            throw new Error('Cannot have duplicate keys in a keyed each');
        }
        keys.add(key);
    }
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
}
function append_dev(target, node) {
    dispatch_dev('SvelteDOMInsert', { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
    const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
    else
        dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    dispatch_dev('SvelteDOMSetData', { node: text, data });
    text.data = data;
}
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 */
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error("'target' is a required option");
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn('Component was already destroyed'); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

/* src\layout\Header.svelte generated by Svelte v3.49.0 */

const file$e = "src\\layout\\Header.svelte";

function create_fragment$i(ctx) {
	let div;

	const block = {
		c: function create() {
			div = element("div");
			div.textContent = "Toolkit";
			attr_dev(div, "id", "header");
			attr_dev(div, "class", "svelte-1mj1oaw");
			add_location(div, file$e, 2, 0, 21);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$i.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$i($$self, $$props) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Header', slots, []);
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
	});

	return [];
}

class Header extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Header",
			options,
			id: create_fragment$i.name
		});
	}
}

/* src\layout\Menu.svelte generated by Svelte v3.49.0 */

const file$d = "src\\layout\\Menu.svelte";

function create_fragment$h(ctx) {
	let nav;
	let ul;
	let li0;
	let t1;
	let li1;

	const block = {
		c: function create() {
			nav = element("nav");
			ul = element("ul");
			li0 = element("li");
			li0.textContent = "Date Util";
			t1 = space();
			li1 = element("li");
			li1.textContent = "Work Log";
			attr_dev(li0, "class", "svelte-e82p89");
			add_location(li0, file$d, 4, 8, 94);
			attr_dev(li1, "class", "svelte-e82p89");
			add_location(li1, file$d, 5, 8, 122);
			attr_dev(ul, "class", "svelte-e82p89");
			add_location(ul, file$d, 3, 4, 80);
			attr_dev(nav, "class", "left-nav svelte-e82p89");
			attr_dev(nav, "aria-labelledby", "primary-menu");
			add_location(nav, file$d, 2, 0, 21);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, nav, anchor);
			append_dev(nav, ul);
			append_dev(ul, li0);
			append_dev(ul, t1);
			append_dev(ul, li1);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(nav);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$h.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$h($$self, $$props) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Menu', slots, []);
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Menu> was created with unknown prop '${key}'`);
	});

	return [];
}

class Menu extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Menu",
			options,
			id: create_fragment$h.name
		});
	}
}

const subscriber_queue = [];
/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param value initial value
 * @param {StartStopNotifier}start start and stop notifications for subscriptions
 */
function readable(value, start) {
    return {
        subscribe: writable(value, start).subscribe
    };
}
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = new Set();
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (const subscriber of subscribers) {
                    subscriber[1]();
                    subscriber_queue.push(subscriber, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.add(subscriber);
        if (subscribers.size === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            subscribers.delete(subscriber);
            if (subscribers.size === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}
function derived(stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single
        ? [stores]
        : stores;
    const auto = fn.length < 2;
    return readable(initial_value, (set) => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;
        const sync = () => {
            if (pending) {
                return;
            }
            cleanup();
            const result = fn(single ? values[0] : values, set);
            if (auto) {
                set(result);
            }
            else {
                cleanup = is_function(result) ? result : noop;
            }
        };
        const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
            values[i] = value;
            pending &= ~(1 << i);
            if (inited) {
                sync();
            }
        }, () => {
            pending |= (1 << i);
        }));
        inited = true;
        sync();
        return function stop() {
            run_all(unsubscribers);
            cleanup();
        };
    });
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var dayjs_min = {exports: {}};

(function (module, exports) {
	!function(t,e){module.exports=e();}(commonjsGlobal,(function(){var t=1e3,e=6e4,n=36e5,r="millisecond",i="second",s="minute",u="hour",a="day",o="week",f="month",h="quarter",c="year",d="date",$="Invalid Date",l=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,y=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,M={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_")},m=function(t,e,n){var r=String(t);return !r||r.length>=e?t:""+Array(e+1-r.length).join(n)+t},g={s:m,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),r=Math.floor(n/60),i=n%60;return (e<=0?"+":"-")+m(r,2,"0")+":"+m(i,2,"0")},m:function t(e,n){if(e.date()<n.date())return -t(n,e);var r=12*(n.year()-e.year())+(n.month()-e.month()),i=e.clone().add(r,f),s=n-i<0,u=e.clone().add(r+(s?-1:1),f);return +(-(r+(n-i)/(s?i-u:u-i))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(t){return {M:f,y:c,w:o,d:a,D:d,h:u,m:s,s:i,ms:r,Q:h}[t]||String(t||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},v="en",D={};D[v]=M;var p=function(t){return t instanceof _},S=function t(e,n,r){var i;if(!e)return v;if("string"==typeof e){var s=e.toLowerCase();D[s]&&(i=s),n&&(D[s]=n,i=s);var u=e.split("-");if(!i&&u.length>1)return t(u[0])}else {var a=e.name;D[a]=e,i=a;}return !r&&i&&(v=i),i||!r&&v},w=function(t,e){if(p(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new _(n)},O=g;O.l=S,O.i=p,O.w=function(t,e){return w(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var _=function(){function M(t){this.$L=S(t.locale,null,!0),this.parse(t);}var m=M.prototype;return m.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(O.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var r=e.match(l);if(r){var i=r[2]-1||0,s=(r[7]||"0").substring(0,3);return n?new Date(Date.UTC(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)):new Date(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)}}return new Date(e)}(t),this.$x=t.x||{},this.init();},m.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds();},m.$utils=function(){return O},m.isValid=function(){return !(this.$d.toString()===$)},m.isSame=function(t,e){var n=w(t);return this.startOf(e)<=n&&n<=this.endOf(e)},m.isAfter=function(t,e){return w(t)<this.startOf(e)},m.isBefore=function(t,e){return this.endOf(e)<w(t)},m.$g=function(t,e,n){return O.u(t)?this[e]:this.set(n,t)},m.unix=function(){return Math.floor(this.valueOf()/1e3)},m.valueOf=function(){return this.$d.getTime()},m.startOf=function(t,e){var n=this,r=!!O.u(e)||e,h=O.p(t),$=function(t,e){var i=O.w(n.$u?Date.UTC(n.$y,e,t):new Date(n.$y,e,t),n);return r?i:i.endOf(a)},l=function(t,e){return O.w(n.toDate()[t].apply(n.toDate("s"),(r?[0,0,0,0]:[23,59,59,999]).slice(e)),n)},y=this.$W,M=this.$M,m=this.$D,g="set"+(this.$u?"UTC":"");switch(h){case c:return r?$(1,0):$(31,11);case f:return r?$(1,M):$(0,M+1);case o:var v=this.$locale().weekStart||0,D=(y<v?y+7:y)-v;return $(r?m-D:m+(6-D),M);case a:case d:return l(g+"Hours",0);case u:return l(g+"Minutes",1);case s:return l(g+"Seconds",2);case i:return l(g+"Milliseconds",3);default:return this.clone()}},m.endOf=function(t){return this.startOf(t,!1)},m.$set=function(t,e){var n,o=O.p(t),h="set"+(this.$u?"UTC":""),$=(n={},n[a]=h+"Date",n[d]=h+"Date",n[f]=h+"Month",n[c]=h+"FullYear",n[u]=h+"Hours",n[s]=h+"Minutes",n[i]=h+"Seconds",n[r]=h+"Milliseconds",n)[o],l=o===a?this.$D+(e-this.$W):e;if(o===f||o===c){var y=this.clone().set(d,1);y.$d[$](l),y.init(),this.$d=y.set(d,Math.min(this.$D,y.daysInMonth())).$d;}else $&&this.$d[$](l);return this.init(),this},m.set=function(t,e){return this.clone().$set(t,e)},m.get=function(t){return this[O.p(t)]()},m.add=function(r,h){var d,$=this;r=Number(r);var l=O.p(h),y=function(t){var e=w($);return O.w(e.date(e.date()+Math.round(t*r)),$)};if(l===f)return this.set(f,this.$M+r);if(l===c)return this.set(c,this.$y+r);if(l===a)return y(1);if(l===o)return y(7);var M=(d={},d[s]=e,d[u]=n,d[i]=t,d)[l]||1,m=this.$d.getTime()+r*M;return O.w(m,this)},m.subtract=function(t,e){return this.add(-1*t,e)},m.format=function(t){var e=this,n=this.$locale();if(!this.isValid())return n.invalidDate||$;var r=t||"YYYY-MM-DDTHH:mm:ssZ",i=O.z(this),s=this.$H,u=this.$m,a=this.$M,o=n.weekdays,f=n.months,h=function(t,n,i,s){return t&&(t[n]||t(e,r))||i[n].slice(0,s)},c=function(t){return O.s(s%12||12,t,"0")},d=n.meridiem||function(t,e,n){var r=t<12?"AM":"PM";return n?r.toLowerCase():r},l={YY:String(this.$y).slice(-2),YYYY:this.$y,M:a+1,MM:O.s(a+1,2,"0"),MMM:h(n.monthsShort,a,f,3),MMMM:h(f,a),D:this.$D,DD:O.s(this.$D,2,"0"),d:String(this.$W),dd:h(n.weekdaysMin,this.$W,o,2),ddd:h(n.weekdaysShort,this.$W,o,3),dddd:o[this.$W],H:String(s),HH:O.s(s,2,"0"),h:c(1),hh:c(2),a:d(s,u,!0),A:d(s,u,!1),m:String(u),mm:O.s(u,2,"0"),s:String(this.$s),ss:O.s(this.$s,2,"0"),SSS:O.s(this.$ms,3,"0"),Z:i};return r.replace(y,(function(t,e){return e||l[t]||i.replace(":","")}))},m.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},m.diff=function(r,d,$){var l,y=O.p(d),M=w(r),m=(M.utcOffset()-this.utcOffset())*e,g=this-M,v=O.m(this,M);return v=(l={},l[c]=v/12,l[f]=v,l[h]=v/3,l[o]=(g-m)/6048e5,l[a]=(g-m)/864e5,l[u]=g/n,l[s]=g/e,l[i]=g/t,l)[y]||g,$?v:O.a(v)},m.daysInMonth=function(){return this.endOf(f).$D},m.$locale=function(){return D[this.$L]},m.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),r=S(t,e,!0);return r&&(n.$L=r),n},m.clone=function(){return O.w(this.$d,this)},m.toDate=function(){return new Date(this.valueOf())},m.toJSON=function(){return this.isValid()?this.toISOString():null},m.toISOString=function(){return this.$d.toISOString()},m.toString=function(){return this.$d.toUTCString()},M}(),T=_.prototype;return w.prototype=T,[["$ms",r],["$s",i],["$m",s],["$H",u],["$W",a],["$M",f],["$y",c],["$D",d]].forEach((function(t){T[t[1]]=function(e){return this.$g(e,t[0],t[1])};})),w.extend=function(t,e){return t.$i||(t(e,_,w),t.$i=!0),w},w.locale=S,w.isDayjs=p,w.unix=function(t){return w(1e3*t)},w.en=D[v],w.Ls=D,w.p={},w}));
} (dayjs_min));

var dayjs = dayjs_min.exports;

const PICKER_TYPES = ['days', 'months', 'years'];

const updateSelected = (value, property) => (state) => {
	const newState = { ...state, [property]: value };
	return { ...newState, selected: new Date(newState.year, newState.month, newState.day) };
};

const pipe = (...fns) => (val) => fns.reduce((accum, fn) => fn(accum), val);

const zeroDay = (date) => dayjs(date).startOf('day').toDate();

const get = ({ selected, start, end, startOfWeekIndex = 0, shouldEnlargeDay = false }) => {
	const { subscribe, set, update } = writable({
		open: false,
		hasChosen: false,
		selected,
		start: zeroDay(start),
		end: zeroDay(end),
		shouldEnlargeDay,
		enlargeDay: false,
		year: selected.getFullYear(),
		month: selected.getMonth(),
		day: selected.getDate(),
		activeView: 'days',
		activeViewDirection: 1,
		startOfWeekIndex
	});

	return {
		set,
		subscribe,
		getState() {
			return get_store_value({ subscribe });
		},
		enlargeDay(enlargeDay = true) {
			update((state) => ({ ...state, enlargeDay }));
		},
		getSelectableVector(date) {
			const { start, end } = this.getState();
			if (date < start) return -1;
			if (date > end) return 1;
			return 0;
		},
		isSelectable(date, clamping = []) {
			const vector = this.getSelectableVector(date);
			if (vector === 0) return true;
			if (!clamping.length) return false;
			const clamped = this.clampValue(dayjs(date), clamping).toDate();
			return this.isSelectable(clamped);
		},
		clampValue(day, clampable) {
			const vector = this.getSelectableVector(day.toDate());
			if (vector === 0) return day;
			const boundaryKey = vector === 1 ? 'end' : 'start';
			const boundary = dayjs(this.getState()[boundaryKey]);
			return clampable.reduce((day, type) => day[type](boundary[type]()), day);
		},
		add(amount, unit, clampable = []) {
			update(({ month, year, day, ...state }) => {
				const d = this.clampValue(dayjs(new Date(year, month, day)).add(amount, unit), clampable);
				if (!this.isSelectable(d.toDate())) return { ...state, year, month, day };
				return {
					...state,
					month: d.month(),
					year: d.year(),
					day: d.date(),
					selected: d.toDate()
				};
			});
		},
		setActiveView(newActiveView) {
			const newIndex = PICKER_TYPES.indexOf(newActiveView);
			if (newIndex === -1) return;
			update(({ activeView, ...state }) => ({
				...state,
				activeViewDirection: PICKER_TYPES.indexOf(activeView) > newIndex ? -1 : 1,
				activeView: newActiveView
			}));
		},
		setYear(year) {
			update(updateSelected(year, 'year'));
		},
		setMonth(month) {
			update(updateSelected(month, 'month'));
		},
		setDay(day) {
			update(
				pipe(
					updateSelected(day.getDate(), 'day'),
					updateSelected(day.getMonth(), 'month'),
					updateSelected(day.getFullYear(), 'year')
				)
			);
		},
		close(extraState) {
			update((state) => ({ ...state, ...extraState, open: false }));
		},
		selectDay() {
			this.close({ hasChosen: true });
		},
		getCalendarPage(month, year) {
			const { startOfWeekIndex } = this.getState();
			let last = { date: new Date(year, month, 1), outsider: false };
			const days = [];

			while (last.date.getMonth() === month) {
				days.push(last);
				const date = new Date(last.date);
				date.setDate(last.date.getDate() + 1);
				last = { date, outsider: false };
			}

			while (days[0].date.getDay() !== startOfWeekIndex) {
				const date = new Date(days[0].date);
				date.setDate(days[0].date.getDate() - 1);
				days.unshift({
					date,
					outsider: true
				});
			}

			last.outsider = true;
			while (days.length < 42) {
				days.push(last);
				last = { date: new Date(last.date), outsider: true };
				last.date.setDate(last.date.getDate() + 1);
			}

			return days;
		}
	};
};

var datepickerStore = { get };

const storeContextKey = {};
const keyControlsContextKey = {};
const themeContextKey = {};

function cubicInOut(t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
}
function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}
function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
    const o = +getComputedStyle(node).opacity;
    return {
        delay,
        duration,
        easing,
        css: t => `opacity: ${t * o}`
    };
}
function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const transform = style.transform === 'none' ? '' : style.transform;
    const sd = 1 - start;
    const od = target_opacity * (1 - opacity);
    return {
        delay,
        duration,
        easing,
        css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
    };
}
function crossfade(_a) {
    var { fallback } = _a, defaults = __rest(_a, ["fallback"]);
    const to_receive = new Map();
    const to_send = new Map();
    function crossfade(from, node, params) {
        const { delay = 0, duration = d => Math.sqrt(d) * 30, easing = cubicOut } = assign(assign({}, defaults), params);
        const to = node.getBoundingClientRect();
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        const dw = from.width / to.width;
        const dh = from.height / to.height;
        const d = Math.sqrt(dx * dx + dy * dy);
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const opacity = +style.opacity;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
        };
    }
    function transition(items, counterparts, intro) {
        return (node, params) => {
            items.set(params.key, {
                rect: node.getBoundingClientRect()
            });
            return () => {
                if (counterparts.has(params.key)) {
                    const { rect } = counterparts.get(params.key);
                    counterparts.delete(params.key);
                    return crossfade(rect, node, params);
                }
                // if the node is disappearing altogether
                // (i.e. wasn't claimed by the other list)
                // then we need to supply an outro
                items.delete(params.key);
                return fallback && fallback(node, params, intro);
            };
        };
    }
    return [
        transition(to_send, to_receive, false),
        transition(to_receive, to_send, true)
    ];
}

/* node_modules\svelte-calendar\components\generic\crossfade\Crossfade.svelte generated by Svelte v3.49.0 */
const get_default_slot_changes$5 = dirty => ({ key: dirty & /*key*/ 1 });

const get_default_slot_context$5 = ctx => ({
	key: /*key*/ ctx[0],
	send: /*send*/ ctx[1],
	receive: /*receive*/ ctx[2]
});

function create_fragment$g(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], get_default_slot_context$5);

	const block = {
		c: function create() {
			if (default_slot) default_slot.c();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope, key*/ 33)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, get_default_slot_changes$5),
						get_default_slot_context$5
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$g.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$g($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Crossfade', slots, ['default']);
	let { key = {} } = $$props;
	let { duration = d => Math.max(150, Math.sqrt(d * 150)) } = $$props;
	let { easing = cubicInOut } = $$props;

	const [send, receive] = crossfade({
		duration,
		easing,
		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;

			return {
				duration,
				easing,
				css: t => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`
			};
		}
	});

	const store = readable({ key, send, receive });
	setContext('crossfade', store);
	const writable_props = ['key', 'duration', 'easing'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Crossfade> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('key' in $$props) $$invalidate(0, key = $$props.key);
		if ('duration' in $$props) $$invalidate(3, duration = $$props.duration);
		if ('easing' in $$props) $$invalidate(4, easing = $$props.easing);
		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		setContext,
		readable,
		crossfade,
		cubicInOut,
		key,
		duration,
		easing,
		send,
		receive,
		store
	});

	$$self.$inject_state = $$props => {
		if ('key' in $$props) $$invalidate(0, key = $$props.key);
		if ('duration' in $$props) $$invalidate(3, duration = $$props.duration);
		if ('easing' in $$props) $$invalidate(4, easing = $$props.easing);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [key, send, receive, duration, easing, $$scope, slots];
}

class Crossfade extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$g, create_fragment$g, safe_not_equal, { key: 0, duration: 3, easing: 4 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Crossfade",
			options,
			id: create_fragment$g.name
		});
	}

	get key() {
		throw new Error("<Crossfade>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set key(value) {
		throw new Error("<Crossfade>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get duration() {
		throw new Error("<Crossfade>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set duration(value) {
		throw new Error("<Crossfade>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get easing() {
		throw new Error("<Crossfade>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set easing(value) {
		throw new Error("<Crossfade>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

var blurr = (node) => {
	const click = (evt) => {
		if (!node || node.contains(evt.target) || evt.defaultPrevented) return;
		node.dispatchEvent(new CustomEvent('blurr', node));
	};

	document.addEventListener('click', click, true);

	return {
		destroy() {
			document.removeEventListener('click', click, true);
		}
	};
};

/* node_modules\svelte-calendar\components\Popover.svelte generated by Svelte v3.49.0 */
const file$c = "node_modules\\svelte-calendar\\components\\Popover.svelte";

const get_contents_slot_changes = dirty => ({
	key: dirty & /*key*/ 1048576,
	send: dirty & /*send*/ 524288,
	receive: dirty & /*receive*/ 262144
});

const get_contents_slot_context = ctx => ({
	key: /*key*/ ctx[20],
	send: /*send*/ ctx[19],
	receive: /*receive*/ ctx[18]
});

const get_default_slot_changes$4 = dirty => ({
	key: dirty & /*key*/ 1048576,
	send: dirty & /*send*/ 524288,
	receive: dirty & /*receive*/ 262144
});

const get_default_slot_context$4 = ctx => ({
	key: /*key*/ ctx[20],
	send: /*send*/ ctx[19],
	receive: /*receive*/ ctx[18]
});

// (69:2) {:else}
function create_else_block(ctx) {
	let div2;
	let div1;
	let div0;
	let current;
	const contents_slot_template = /*#slots*/ ctx[10].contents;
	const contents_slot = create_slot(contents_slot_template, ctx, /*$$scope*/ ctx[14], get_contents_slot_context);

	const block = {
		c: function create() {
			div2 = element("div");
			div1 = element("div");
			div0 = element("div");
			if (contents_slot) contents_slot.c();
			attr_dev(div0, "class", "contents-inner");
			add_location(div0, file$c, 75, 5, 1712);
			attr_dev(div1, "class", "contents");
			add_location(div1, file$c, 74, 4, 1684);
			attr_dev(div2, "class", "contents-wrapper svelte-ff0ii6");
			set_style(div2, "transform", "translate(-50%,-50%) translate(" + /*translateX*/ ctx[4] + "px, " + /*translateY*/ ctx[3] + "px)");
			add_location(div2, file$c, 69, 3, 1523);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div2, anchor);
			append_dev(div2, div1);
			append_dev(div1, div0);

			if (contents_slot) {
				contents_slot.m(div0, null);
			}

			/*div2_binding*/ ctx[12](div2);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (contents_slot) {
				if (contents_slot.p && (!current || dirty & /*$$scope, key, send, receive*/ 1851392)) {
					update_slot_base(
						contents_slot,
						contents_slot_template,
						ctx,
						/*$$scope*/ ctx[14],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[14])
						: get_slot_changes(contents_slot_template, /*$$scope*/ ctx[14], dirty, get_contents_slot_changes),
						get_contents_slot_context
					);
				}
			}

			if (!current || dirty & /*translateX, translateY*/ 24) {
				set_style(div2, "transform", "translate(-50%,-50%) translate(" + /*translateX*/ ctx[4] + "px, " + /*translateY*/ ctx[3] + "px)");
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(contents_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(contents_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div2);
			if (contents_slot) contents_slot.d(detaching);
			/*div2_binding*/ ctx[12](null);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(69:2) {:else}",
		ctx
	});

	return block;
}

// (60:2) {#if !isOpen}
function create_if_block$3(ctx) {
	let div;
	let div_resize_listener;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[10].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context$4);

	const block = {
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr_dev(div, "class", "trigger svelte-ff0ii6");
			add_render_callback(() => /*div_elementresize_handler*/ ctx[11].call(div));
			add_location(div, file$c, 60, 3, 1333);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[11].bind(div));
			current = true;

			if (!mounted) {
				dispose = listen_dev(div, "click", /*openPopover*/ ctx[9], false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope, key, send, receive*/ 1851392)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[14],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[14])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, get_default_slot_changes$4),
						get_default_slot_context$4
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (default_slot) default_slot.d(detaching);
			div_resize_listener();
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$3.name,
		type: "if",
		source: "(60:2) {#if !isOpen}",
		ctx
	});

	return block;
}

// (52:0) <Crossfade let:receive let:send let:key>
function create_default_slot$5(ctx) {
	let div;
	let current_block_type_index;
	let if_block;
	let div_style_value;
	let current;
	let mounted;
	let dispose;
	const if_block_creators = [create_if_block$3, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (!/*isOpen*/ ctx[0]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			div = element("div");
			if_block.c();
			attr_dev(div, "class", "sc-popover svelte-ff0ii6");
			attr_dev(div, "style", div_style_value = "" + (/*style*/ ctx[1] + "; min-width: " + (/*triggerWidth*/ ctx[6] + 1) + "px; min-height: " + (/*triggerHeight*/ ctx[7] + 1) + "px;"));
			add_location(div, file$c, 52, 1, 1145);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if_blocks[current_block_type_index].m(div, null);
			/*div_binding*/ ctx[13](div);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(blurr.call(null, div)),
					listen_dev(div, "blurr", /*close*/ ctx[2], false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(div, null);
			}

			if (!current || dirty & /*style, triggerWidth, triggerHeight*/ 194 && div_style_value !== (div_style_value = "" + (/*style*/ ctx[1] + "; min-width: " + (/*triggerWidth*/ ctx[6] + 1) + "px; min-height: " + (/*triggerHeight*/ ctx[7] + 1) + "px;"))) {
				attr_dev(div, "style", div_style_value);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if_blocks[current_block_type_index].d();
			/*div_binding*/ ctx[13](null);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot$5.name,
		type: "slot",
		source: "(52:0) <Crossfade let:receive let:send let:key>",
		ctx
	});

	return block;
}

function create_fragment$f(ctx) {
	let crossfade;
	let current;

	crossfade = new Crossfade({
			props: {
				$$slots: {
					default: [
						create_default_slot$5,
						({ receive, send, key }) => ({ 18: receive, 19: send, 20: key }),
						({ receive, send, key }) => (receive ? 262144 : 0) | (send ? 524288 : 0) | (key ? 1048576 : 0)
					]
				},
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(crossfade.$$.fragment);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(crossfade, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const crossfade_changes = {};

			if (dirty & /*$$scope, style, triggerWidth, triggerHeight, popover, key, send, receive, isOpen, translateX, translateY, contentsWrapper*/ 1851899) {
				crossfade_changes.$$scope = { dirty, ctx };
			}

			crossfade.$set(crossfade_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(crossfade.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(crossfade.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(crossfade, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$f.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$f($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Popover', slots, ['default','contents']);
	let { isOpen = false } = $$props;
	let { style = '' } = $$props;
	let translateY = 0;
	let translateX = 0;
	let popover;
	let triggerWidth;
	let triggerHeight;
	let contentsWrapper;

	const close = () => {
		$$invalidate(0, isOpen = false);
	};

	const getDistanceToEdges = () => {
		let { top, bottom, left, right } = contentsWrapper.getBoundingClientRect();

		return {
			top: top + -1 * translateY,
			bottom: window.innerHeight - bottom + translateY,
			left: left + -1 * translateX,
			right: document.body.clientWidth - right + translateX
		};
	};

	const getY = ({ bottom, top }) => {
		if (top < 0) return -1 * top;
		if (bottom < 0) return bottom;
		return 0;
	};

	const getX = ({ left, right }) => {
		if (left < 0) return -1 * left;
		if (right < 0) return right;
		return 0;
	};

	const openPopover = async () => {
		$$invalidate(0, isOpen = true);
		await tick();
		let dist = getDistanceToEdges();
		$$invalidate(4, translateX = getX(dist));
		$$invalidate(3, translateY = getY(dist));
	};

	const writable_props = ['isOpen', 'style'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Popover> was created with unknown prop '${key}'`);
	});

	function div_elementresize_handler() {
		triggerWidth = this.offsetWidth;
		triggerHeight = this.offsetHeight;
		$$invalidate(6, triggerWidth);
		$$invalidate(7, triggerHeight);
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			contentsWrapper = $$value;
			$$invalidate(8, contentsWrapper);
		});
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			popover = $$value;
			$$invalidate(5, popover);
		});
	}

	$$self.$$set = $$props => {
		if ('isOpen' in $$props) $$invalidate(0, isOpen = $$props.isOpen);
		if ('style' in $$props) $$invalidate(1, style = $$props.style);
		if ('$$scope' in $$props) $$invalidate(14, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		Crossfade,
		blurr,
		tick,
		isOpen,
		style,
		translateY,
		translateX,
		popover,
		triggerWidth,
		triggerHeight,
		contentsWrapper,
		close,
		getDistanceToEdges,
		getY,
		getX,
		openPopover
	});

	$$self.$inject_state = $$props => {
		if ('isOpen' in $$props) $$invalidate(0, isOpen = $$props.isOpen);
		if ('style' in $$props) $$invalidate(1, style = $$props.style);
		if ('translateY' in $$props) $$invalidate(3, translateY = $$props.translateY);
		if ('translateX' in $$props) $$invalidate(4, translateX = $$props.translateX);
		if ('popover' in $$props) $$invalidate(5, popover = $$props.popover);
		if ('triggerWidth' in $$props) $$invalidate(6, triggerWidth = $$props.triggerWidth);
		if ('triggerHeight' in $$props) $$invalidate(7, triggerHeight = $$props.triggerHeight);
		if ('contentsWrapper' in $$props) $$invalidate(8, contentsWrapper = $$props.contentsWrapper);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		isOpen,
		style,
		close,
		translateY,
		translateX,
		popover,
		triggerWidth,
		triggerHeight,
		contentsWrapper,
		openPopover,
		slots,
		div_elementresize_handler,
		div2_binding,
		div_binding,
		$$scope
	];
}

class Popover extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$f, create_fragment$f, safe_not_equal, { isOpen: 0, style: 1, close: 2 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Popover",
			options,
			id: create_fragment$f.name
		});
	}

	get isOpen() {
		throw new Error("<Popover>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set isOpen(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get style() {
		throw new Error("<Popover>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set style(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get close() {
		return this.$$.ctx[2];
	}

	set close(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

const light = {
	calendar: {
		width: '700px',
		maxWidth: '100vw',
		legend: {
			height: '45px'
		},
		shadow: '0px 10px 26px rgba(0, 0, 0, 0.25)',
		colors: {
			text: {
				primary: '#333',
				highlight: '#fff'
			},
			background: {
				primary: '#fff',
				highlight: '#eb7400',
				hover: '#eee'
			},
			border: '#eee'
		},
		font: {
			regular: '1.5em',
			large: '37em'
		},
		grid: {
			disabledOpacity: '.35',
			outsiderOpacity: '.6'
		}
	}
};

/* node_modules\svelte-calendar\components\generic\Theme.svelte generated by Svelte v3.49.0 */

const { Object: Object_1$1 } = globals;

const get_default_slot_changes$3 = dirty => ({
	appliedTheme: dirty & /*appliedTheme*/ 1,
	style: dirty & /*style*/ 2
});

const get_default_slot_context$3 = ctx => ({
	appliedTheme: /*appliedTheme*/ ctx[0],
	style: /*style*/ ctx[1]
});

function create_fragment$e(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], get_default_slot_context$3);

	const block = {
		c: function create() {
			if (default_slot) default_slot.c();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope, appliedTheme, style*/ 35)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[5],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, get_default_slot_changes$3),
						get_default_slot_context$3
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$e.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$e($$self, $$props, $$invalidate) {
	let style;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Theme', slots, ['default']);
	let { theme = {} } = $$props;
	let { appliedTheme } = $$props;
	let { prefix = '--sc-theme' } = $$props;
	let { defaultTheme = light } = $$props;
	const store = writable();
	setContext(themeContextKey, store);
	const getStyle = obj => Object.entries(obj).map(([k, v]) => `${prefix}-${k}: ${v}`).join(';');

	const getTheme = (defaults, overrides = {}, base = '') => Object.entries(defaults).reduce(
		(acc, [k, v]) => {
			if (typeof v === 'object') return {
				...acc,
				...getTheme(v, overrides[k], [base, k].filter(Boolean).join('-'))
			};

			return {
				...acc,
				[[base, k].filter(Boolean).join('-')]: overrides[k] || v
			};
		},
		{}
	);

	const writable_props = ['theme', 'appliedTheme', 'prefix', 'defaultTheme'];

	Object_1$1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Theme> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('theme' in $$props) $$invalidate(2, theme = $$props.theme);
		if ('appliedTheme' in $$props) $$invalidate(0, appliedTheme = $$props.appliedTheme);
		if ('prefix' in $$props) $$invalidate(3, prefix = $$props.prefix);
		if ('defaultTheme' in $$props) $$invalidate(4, defaultTheme = $$props.defaultTheme);
		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		lightTheme: light,
		themeContextKey,
		setContext,
		writable,
		theme,
		appliedTheme,
		prefix,
		defaultTheme,
		store,
		getStyle,
		getTheme,
		style
	});

	$$self.$inject_state = $$props => {
		if ('theme' in $$props) $$invalidate(2, theme = $$props.theme);
		if ('appliedTheme' in $$props) $$invalidate(0, appliedTheme = $$props.appliedTheme);
		if ('prefix' in $$props) $$invalidate(3, prefix = $$props.prefix);
		if ('defaultTheme' in $$props) $$invalidate(4, defaultTheme = $$props.defaultTheme);
		if ('style' in $$props) $$invalidate(1, style = $$props.style);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*defaultTheme, theme*/ 20) {
			$$invalidate(0, appliedTheme = getTheme(defaultTheme, theme));
		}

		if ($$self.$$.dirty & /*appliedTheme*/ 1) {
			$$invalidate(1, style = getStyle(appliedTheme));
		}

		if ($$self.$$.dirty & /*appliedTheme*/ 1) {
			store.set(appliedTheme);
		}
	};

	return [appliedTheme, style, theme, prefix, defaultTheme, $$scope, slots];
}

class Theme extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$e, create_fragment$e, safe_not_equal, {
			theme: 2,
			appliedTheme: 0,
			prefix: 3,
			defaultTheme: 4
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Theme",
			options,
			id: create_fragment$e.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*appliedTheme*/ ctx[0] === undefined && !('appliedTheme' in props)) {
			console.warn("<Theme> was created without expected prop 'appliedTheme'");
		}
	}

	get theme() {
		throw new Error("<Theme>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set theme(value) {
		throw new Error("<Theme>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get appliedTheme() {
		throw new Error("<Theme>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set appliedTheme(value) {
		throw new Error("<Theme>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get prefix() {
		throw new Error("<Theme>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set prefix(value) {
		throw new Error("<Theme>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get defaultTheme() {
		throw new Error("<Theme>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set defaultTheme(value) {
		throw new Error("<Theme>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

const KEY_CODES = {
	33: 'pageUp',
	34: 'pageDown',
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down',
	27: 'escape',
	13: 'enter',
	17: 'control'
};

var justThrottle = throttle;

function throttle(fn, interval, options) {
  var timeoutId = null;
  var throttledFn = null;
  var leading = (options && options.leading);
  var trailing = (options && options.trailing);

  if (leading == null) {
    leading = true; // default
  }

  if (trailing == null) {
    trailing = !leading; //default
  }

  if (leading == true) {
    trailing = false; // forced because there should be invocation per call
  }

  var cancel = function() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  var flush = function() {
    var call = throttledFn;
    cancel();

    if (call) {
      call();
    }
  };

  var throttleWrapper = function() {
    var callNow = leading && !timeoutId;
    var context = this;
    var args = arguments;

    throttledFn = function() {
      return fn.apply(context, args);
    };

    if (!timeoutId) {
      timeoutId = setTimeout(function() {
        timeoutId = null;

        if (trailing) {
          return throttledFn();
        }
      }, interval);
    }

    if (callNow) {
      callNow = false;
      return throttledFn();
    }
  };

  throttleWrapper.cancel = cancel;
  throttleWrapper.flush = flush;

  return throttleWrapper;
}

/* node_modules\svelte-calendar\components\generic\KeyControls.svelte generated by Svelte v3.49.0 */

function create_fragment$d(ctx) {
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

	const block = {
		c: function create() {
			if (default_slot) default_slot.c();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;

			if (!mounted) {
				dispose = listen_dev(
					window,
					"keydown",
					function () {
						if (is_function(/*eventHandler*/ ctx[0])) /*eventHandler*/ ctx[0].apply(this, arguments);
					},
					false,
					false,
					false
				);

				mounted = true;
			}
		},
		p: function update(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
						null
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$d.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$d($$self, $$props, $$invalidate) {
	let eventHandler;
	let $currentCtx;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('KeyControls', slots, ['default']);
	let { limit = 0 } = $$props;
	let { ctx = null } = $$props;
	const currentCtx = getContext(keyControlsContextKey);
	validate_store(currentCtx, 'currentCtx');
	component_subscribe($$self, currentCtx, value => $$invalidate(6, $currentCtx = value));

	const key = evt => {
		if (ctx && !ctx.includes($currentCtx)) return;
		const mapping = $$props[KEY_CODES[evt.keyCode]];
		if (mapping) mapping();
	};

	$$self.$$set = $$new_props => {
		$$invalidate(8, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ('limit' in $$new_props) $$invalidate(2, limit = $$new_props.limit);
		if ('ctx' in $$new_props) $$invalidate(3, ctx = $$new_props.ctx);
		if ('$$scope' in $$new_props) $$invalidate(4, $$scope = $$new_props.$$scope);
	};

	$$self.$capture_state = () => ({
		KEY_CODES,
		keyControlsContextKey,
		throttle: justThrottle,
		getContext,
		limit,
		ctx,
		currentCtx,
		key,
		eventHandler,
		$currentCtx
	});

	$$self.$inject_state = $$new_props => {
		$$invalidate(8, $$props = assign(assign({}, $$props), $$new_props));
		if ('limit' in $$props) $$invalidate(2, limit = $$new_props.limit);
		if ('ctx' in $$props) $$invalidate(3, ctx = $$new_props.ctx);
		if ('eventHandler' in $$props) $$invalidate(0, eventHandler = $$new_props.eventHandler);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*limit*/ 4) {
			$$invalidate(0, eventHandler = limit ? justThrottle(key, limit) : key);
		}
	};

	$$props = exclude_internal_props($$props);
	return [eventHandler, currentCtx, limit, ctx, $$scope, slots];
}

class KeyControls extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$d, create_fragment$d, safe_not_equal, { limit: 2, ctx: 3 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "KeyControls",
			options,
			id: create_fragment$d.name
		});
	}

	get limit() {
		throw new Error("<KeyControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set limit(value) {
		throw new Error("<KeyControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get ctx() {
		throw new Error("<KeyControls>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set ctx(value) {
		throw new Error("<KeyControls>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* node_modules\svelte-calendar\components\generic\Grid.svelte generated by Svelte v3.49.0 */

const file$b = "node_modules\\svelte-calendar\\components\\generic\\Grid.svelte";

function create_fragment$c(ctx) {
	let div;
	let current;
	const default_slot_template = /*#slots*/ ctx[2].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

	const block = {
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr_dev(div, "class", "grid svelte-jmgdr0");
			set_style(div, "grid-template", /*template*/ ctx[0]);
			add_location(div, file$b, 4, 0, 78);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 2)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[1],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[1])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*template*/ 1) {
				set_style(div, "grid-template", /*template*/ ctx[0]);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$c.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$c($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Grid', slots, ['default']);
	let { template = 'repeat(4, 1fr) / repeat(3, 1fr)' } = $$props;
	const writable_props = ['template'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Grid> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('template' in $$props) $$invalidate(0, template = $$props.template);
		if ('$$scope' in $$props) $$invalidate(1, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({ template });

	$$self.$inject_state = $$props => {
		if ('template' in $$props) $$invalidate(0, template = $$props.template);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [template, $$scope, slots];
}

class Grid extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$c, create_fragment$c, safe_not_equal, { template: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Grid",
			options,
			id: create_fragment$c.name
		});
	}

	get template() {
		throw new Error("<Grid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set template(value) {
		throw new Error("<Grid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

function is_date(obj) {
    return Object.prototype.toString.call(obj) === '[object Date]';
}

function tick_spring(ctx, last_value, current_value, target_value) {
    if (typeof current_value === 'number' || is_date(current_value)) {
        // @ts-ignore
        const delta = target_value - current_value;
        // @ts-ignore
        const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
        const spring = ctx.opts.stiffness * delta;
        const damper = ctx.opts.damping * velocity;
        const acceleration = (spring - damper) * ctx.inv_mass;
        const d = (velocity + acceleration) * ctx.dt;
        if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
            return target_value; // settled
        }
        else {
            ctx.settled = false; // signal loop to keep ticking
            // @ts-ignore
            return is_date(current_value) ?
                new Date(current_value.getTime() + d) : current_value + d;
        }
    }
    else if (Array.isArray(current_value)) {
        // @ts-ignore
        return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
    }
    else if (typeof current_value === 'object') {
        const next_value = {};
        for (const k in current_value) {
            // @ts-ignore
            next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
        }
        // @ts-ignore
        return next_value;
    }
    else {
        throw new Error(`Cannot spring ${typeof current_value} values`);
    }
}
function spring(value, opts = {}) {
    const store = writable(value);
    const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
    let last_time;
    let task;
    let current_token;
    let last_value = value;
    let target_value = value;
    let inv_mass = 1;
    let inv_mass_recovery_rate = 0;
    let cancel_task = false;
    function set(new_value, opts = {}) {
        target_value = new_value;
        const token = current_token = {};
        if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
            cancel_task = true; // cancel any running animation
            last_time = now();
            last_value = new_value;
            store.set(value = target_value);
            return Promise.resolve();
        }
        else if (opts.soft) {
            const rate = opts.soft === true ? .5 : +opts.soft;
            inv_mass_recovery_rate = 1 / (rate * 60);
            inv_mass = 0; // infinite mass, unaffected by spring forces
        }
        if (!task) {
            last_time = now();
            cancel_task = false;
            task = loop(now => {
                if (cancel_task) {
                    cancel_task = false;
                    task = null;
                    return false;
                }
                inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                const ctx = {
                    inv_mass,
                    opts: spring,
                    settled: true,
                    dt: (now - last_time) * 60 / 1000
                };
                const next_value = tick_spring(ctx, last_value, value, target_value);
                last_time = now;
                last_value = value;
                store.set(value = next_value);
                if (ctx.settled) {
                    task = null;
                }
                return !ctx.settled;
            });
        }
        return new Promise(fulfil => {
            task.promise.then(() => {
                if (token === current_token)
                    fulfil();
            });
        });
    }
    const spring = {
        set,
        update: (fn, opts) => set(fn(target_value, value), opts),
        subscribe: store.subscribe,
        stiffness,
        damping,
        precision
    };
    return spring;
}

/* node_modules\svelte-calendar\components\generic\InfiniteGrid.svelte generated by Svelte v3.49.0 */
const file$a = "node_modules\\svelte-calendar\\components\\generic\\InfiniteGrid.svelte";

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[28] = list[i];
	return child_ctx;
}

const get_default_slot_spread_changes = dirty => dirty & /*$visibleData*/ 16;
const get_default_slot_changes$2 = dirty => ({ index: dirty & /*$visibleData*/ 16 });

const get_default_slot_context$2 = ctx => ({
	.../*obj*/ ctx[28].data,
	index: /*obj*/ ctx[28].index
});

// (74:1) {#each $visibleData as obj (obj.data?.[idKey] || obj.index)}
function create_each_block$4(key_1, ctx) {
	let div;
	let t;
	let current;
	const default_slot_template = /*#slots*/ ctx[21].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[20], get_default_slot_context$2);

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			t = space();
			set_style(div, "transform", "translateY(" + /*obj*/ ctx[28].pos + "px)");
			attr_dev(div, "class", "svelte-198r3wi");
			add_location(div, file$a, 74, 2, 2276);
			this.first = div;
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			append_dev(div, t);
			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope, $visibleData*/ 1048592)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[20],
						get_default_slot_spread_changes(dirty) || !current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[20])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[20], dirty, get_default_slot_changes$2),
						get_default_slot_context$2
					);
				}
			}

			if (!current || dirty & /*$visibleData*/ 16) {
				set_style(div, "transform", "translateY(" + /*obj*/ ctx[28].pos + "px)");
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$4.name,
		type: "each",
		source: "(74:1) {#each $visibleData as obj (obj.data?.[idKey] || obj.index)}",
		ctx
	});

	return block;
}

function create_fragment$b(ctx) {
	let div;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let div_resize_listener;
	let current;
	let each_value = /*$visibleData*/ ctx[4];
	validate_each_argument(each_value);
	const get_key = ctx => /*obj*/ ctx[28].data?.[/*idKey*/ ctx[0]] || /*obj*/ ctx[28].index;
	validate_each_keys(ctx, each_value, get_each_context$4, get_key);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$4(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$4(key, child_ctx));
	}

	const block = {
		c: function create() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(div, "class", "grid svelte-198r3wi");
			attr_dev(div, "style", /*gridStyle*/ ctx[3]);
			add_render_callback(() => /*div_elementresize_handler*/ ctx[22].call(div));
			add_location(div, file$a, 72, 0, 2122);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[22].bind(div));
			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*$visibleData, $$scope, idKey*/ 1048593) {
				each_value = /*$visibleData*/ ctx[4];
				validate_each_argument(each_value);
				group_outros();
				validate_each_keys(ctx, each_value, get_each_context$4, get_key);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$4, null, get_each_context$4);
				check_outros();
			}

			if (!current || dirty & /*gridStyle*/ 8) {
				attr_dev(div, "style", /*gridStyle*/ ctx[3]);
			}
		},
		i: function intro(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o: function outro(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}

			div_resize_listener();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$b.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$b($$self, $$props, $$invalidate) {
	let type;
	let gridStyle;
	let $initialized;
	let $dim;
	let $offset;

	let $visibleData,
		$$unsubscribe_visibleData = noop,
		$$subscribe_visibleData = () => ($$unsubscribe_visibleData(), $$unsubscribe_visibleData = subscribe(visibleData, $$value => $$invalidate(4, $visibleData = $$value)), visibleData);

	$$self.$$.on_destroy.push(() => $$unsubscribe_visibleData());
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('InfiniteGrid', slots, ['default']);
	let { cellCount = 4 } = $$props;
	let { itemCount = 0 } = $$props;
	let { index = 0 } = $$props;
	let { vertical = true } = $$props;
	let { get } = $$props;
	let { stiffness = 0.065 } = $$props;
	let { damping = 0.9 } = $$props;
	let { useCache = true } = $$props;
	let { idKey = undefined } = $$props;

	const move = amount => {
		$$invalidate(8, index = Math.max(0, Math.min(itemCount - 1, index + amount)));
	};

	const forceUpdate = writable(false);

	const triggerUpdate = async () => {
		await tick();
		forceUpdate.set(true);
		await tick();
		forceUpdate.set(false);
	};

	const getCached = index => $visibleData.find(({ index: i }) => i === index)?.data || get(index);
	let inRange = [-Infinity, Infinity];
	const initialized = writable(false);
	validate_store(initialized, 'initialized');
	component_subscribe($$self, initialized, value => $$invalidate(19, $initialized = value));
	const dim = writable({ w: 0, h: 0 });
	validate_store(dim, 'dim');
	component_subscribe($$self, dim, value => $$invalidate(2, $dim = value));
	const offset = spring(0, { stiffness, damping });
	validate_store(offset, 'offset');
	component_subscribe($$self, offset, value => $$invalidate(24, $offset = value));

	const visibleData = derived(
		[dim, offset, initialized, forceUpdate],
		([{ w, h }, $o, $initialized, $force]) => {
			if (!w || !h || !$initialized) return [];
			if ($o < inRange[0] || $o > inRange[1]) return $visibleData;
			const cellHeight = h / cellCount;
			const start = Math.max(-1, Math.floor(-1 * $o / cellHeight) - 1);
			const baseOffset = $o % cellHeight;

			return Array(cellCount + 2).fill(0).map((_, i) => {
				const index = i + start;
				const pos = baseOffset + (i - 1) * cellHeight;
				if (index < 0 || index >= itemCount) return undefined;
				const data = $force || !useCache ? get(index) : getCached(index);
				return { data, pos, index };
			}).filter(Boolean);
		},
		[]
	);

	validate_store(visibleData, 'visibleData');
	$$subscribe_visibleData();

	const updateOffset = o => {
		inRange = [o, $offset].sort((a, b) => a - b);
		offset.set(o, { hard: !$initialized });
	};

	const writable_props = [
		'cellCount',
		'itemCount',
		'index',
		'vertical',
		'get',
		'stiffness',
		'damping',
		'useCache',
		'idKey'
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InfiniteGrid> was created with unknown prop '${key}'`);
	});

	function div_elementresize_handler() {
		$dim.h = this.clientHeight;
		dim.set($dim);
		$dim.w = this.clientWidth;
		dim.set($dim);
	}

	$$self.$$set = $$props => {
		if ('cellCount' in $$props) $$invalidate(9, cellCount = $$props.cellCount);
		if ('itemCount' in $$props) $$invalidate(10, itemCount = $$props.itemCount);
		if ('index' in $$props) $$invalidate(8, index = $$props.index);
		if ('vertical' in $$props) $$invalidate(11, vertical = $$props.vertical);
		if ('get' in $$props) $$invalidate(12, get = $$props.get);
		if ('stiffness' in $$props) $$invalidate(13, stiffness = $$props.stiffness);
		if ('damping' in $$props) $$invalidate(14, damping = $$props.damping);
		if ('useCache' in $$props) $$invalidate(15, useCache = $$props.useCache);
		if ('idKey' in $$props) $$invalidate(0, idKey = $$props.idKey);
		if ('$$scope' in $$props) $$invalidate(20, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		tick,
		spring,
		derived,
		writable,
		cellCount,
		itemCount,
		index,
		vertical,
		get,
		stiffness,
		damping,
		useCache,
		idKey,
		move,
		forceUpdate,
		triggerUpdate,
		getCached,
		inRange,
		initialized,
		dim,
		offset,
		visibleData,
		updateOffset,
		type,
		gridStyle,
		$initialized,
		$dim,
		$offset,
		$visibleData
	});

	$$self.$inject_state = $$props => {
		if ('cellCount' in $$props) $$invalidate(9, cellCount = $$props.cellCount);
		if ('itemCount' in $$props) $$invalidate(10, itemCount = $$props.itemCount);
		if ('index' in $$props) $$invalidate(8, index = $$props.index);
		if ('vertical' in $$props) $$invalidate(11, vertical = $$props.vertical);
		if ('get' in $$props) $$invalidate(12, get = $$props.get);
		if ('stiffness' in $$props) $$invalidate(13, stiffness = $$props.stiffness);
		if ('damping' in $$props) $$invalidate(14, damping = $$props.damping);
		if ('useCache' in $$props) $$invalidate(15, useCache = $$props.useCache);
		if ('idKey' in $$props) $$invalidate(0, idKey = $$props.idKey);
		if ('inRange' in $$props) inRange = $$props.inRange;
		if ('type' in $$props) $$invalidate(18, type = $$props.type);
		if ('gridStyle' in $$props) $$invalidate(3, gridStyle = $$props.gridStyle);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*vertical*/ 2048) {
			$$invalidate(18, type = vertical ? 'rows' : 'columns');
		}

		if ($$self.$$.dirty & /*type, cellCount*/ 262656) {
			$$invalidate(3, gridStyle = `grid-template-${type}: repeat(${cellCount}, 1fr);`);
		}

		if ($$self.$$.dirty & /*$dim, cellCount, index, $initialized*/ 525060) {
			{
				if ($dim.w && $dim.h) {
					updateOffset($dim.h / cellCount * index * -1);
					if (!$initialized) initialized.set(true);
				}
			}
		}
	};

	return [
		idKey,
		visibleData,
		$dim,
		gridStyle,
		$visibleData,
		initialized,
		dim,
		offset,
		index,
		cellCount,
		itemCount,
		vertical,
		get,
		stiffness,
		damping,
		useCache,
		move,
		triggerUpdate,
		type,
		$initialized,
		$$scope,
		slots,
		div_elementresize_handler
	];
}

class InfiniteGrid extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$b, create_fragment$b, safe_not_equal, {
			cellCount: 9,
			itemCount: 10,
			index: 8,
			vertical: 11,
			get: 12,
			stiffness: 13,
			damping: 14,
			useCache: 15,
			idKey: 0,
			move: 16,
			triggerUpdate: 17,
			visibleData: 1
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "InfiniteGrid",
			options,
			id: create_fragment$b.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*get*/ ctx[12] === undefined && !('get' in props)) {
			console.warn("<InfiniteGrid> was created without expected prop 'get'");
		}
	}

	get cellCount() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set cellCount(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get itemCount() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set itemCount(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get index() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set index(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get vertical() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set vertical(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get get() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set get(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get stiffness() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set stiffness(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get damping() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set damping(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get useCache() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set useCache(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get idKey() {
		throw new Error("<InfiniteGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set idKey(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get move() {
		return this.$$.ctx[16];
	}

	set move(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get triggerUpdate() {
		return this.$$.ctx[17];
	}

	set triggerUpdate(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get visibleData() {
		return this.$$.ctx[1];
	}

	set visibleData(value) {
		throw new Error("<InfiniteGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

const scrollStep = 120;

var scrollable = (node, opts) => {
	let { y: yi = 0, step = scrollStep } = opts;
	let lastTouch = 0;
	let y = yi;

	const updateY = (val) => {
		const { maxSteps = Infinity } = opts;
		y = Math.max(0, Math.min(maxSteps * step, val));
	};

	const emitY = () => {
		if (Math.round(y / step) === Math.round(yi / step)) return;
		yi = y;
		node.dispatchEvent(
			new CustomEvent('y', {
				detail: {
					y,
					step: Math.round(y / step)
				}
			})
		);
	};

	const wheelListener = ({ deltaY }) => {
		updateY(y + deltaY);
		emitY();
	};
	const touchstartListener = ({ touches: [{ pageY }] }) => {
		lastTouch = pageY;
		emitY();
	};
	const touchmoveListener = ({ touches: [{ pageY }] }) => {
		updateY(y - (pageY - lastTouch));
		lastTouch = pageY;
		emitY();
	};

	node.addEventListener('wheel', wheelListener);
	node.addEventListener('touchstart', touchstartListener);
	node.addEventListener('touchmove', touchmoveListener);
	node.style.touchAction = 'none';

	return {
		destroy() {
			node.removeEventListener('wheel', wheelListener);
			node.removeEventListener('touchstart', touchstartListener);
			node.removeEventListener('touchmove', touchmoveListener);
		}
	};
};

/* node_modules\svelte-calendar\components\calendar\DayPicker.svelte generated by Svelte v3.49.0 */
const file$9 = "node_modules\\svelte-calendar\\components\\calendar\\DayPicker.svelte";

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[19] = list[i];
	child_ctx[21] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[22] = list[i];
	return child_ctx;
}

// (72:2) {#each legend as label}
function create_each_block_1(ctx) {
	let span;
	let t_value = /*label*/ ctx[22] + "";
	let t;

	const block = {
		c: function create() {
			span = element("span");
			t = text(t_value);
			add_location(span, file$9, 72, 3, 2148);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(span);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(72:2) {#each legend as label}",
		ctx
	});

	return block;
}

// (88:6) {#if !$store.enlargeDay || index !== monthIndex || !dayjs(day.date).isSame($store.selected)}
function create_if_block_1$1(ctx) {
	let a;
	let t0_value = /*day*/ ctx[19].date.getDate() + "";
	let t0;
	let t1;
	let a_intro;
	let a_outro;
	let current;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			a = element("a");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(a, "href", "#pickday");
			attr_dev(a, "class", "svelte-1unzsxu");
			toggle_class(a, "disabled", !/*store*/ ctx[4].isSelectable(/*day*/ ctx[19].date));
			toggle_class(a, "selected", /*index*/ ctx[18] === /*monthIndex*/ ctx[0] && dayjs(/*day*/ ctx[19].date).isSame(/*$store*/ ctx[1].selected, 'day'));
			toggle_class(a, "outsider", /*day*/ ctx[19].outsider);
			add_location(a, file$9, 88, 7, 2659);
		},
		m: function mount(target, anchor) {
			insert_dev(target, a, anchor);
			append_dev(a, t0);
			append_dev(a, t1);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(a, "keydown", prevent_default(/*keydown_handler*/ ctx[10]), false, true, false),
					listen_dev(
						a,
						"click",
						prevent_default(function () {
							if (is_function(/*select*/ ctx[6](/*day*/ ctx[19].date))) /*select*/ ctx[6](/*day*/ ctx[19].date).apply(this, arguments);
						}),
						false,
						true,
						false
					)
				];

				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if ((!current || dirty & /*days*/ 131072) && t0_value !== (t0_value = /*day*/ ctx[19].date.getDate() + "")) set_data_dev(t0, t0_value);

			if (dirty & /*store, days*/ 131088) {
				toggle_class(a, "disabled", !/*store*/ ctx[4].isSelectable(/*day*/ ctx[19].date));
			}

			if (dirty & /*index, monthIndex, dayjs, days, $store*/ 393219) {
				toggle_class(a, "selected", /*index*/ ctx[18] === /*monthIndex*/ ctx[0] && dayjs(/*day*/ ctx[19].date).isSame(/*$store*/ ctx[1].selected, 'day'));
			}

			if (dirty & /*days*/ 131072) {
				toggle_class(a, "outsider", /*day*/ ctx[19].outsider);
			}
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (a_outro) a_outro.end(1);
					a_intro = create_in_transition(a, /*receive*/ ctx[15], { key: /*key*/ ctx[14] });
					a_intro.start();
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (a_intro) a_intro.invalidate();

			if (local) {
				a_outro = create_out_transition(a, /*send*/ ctx[16], { key: /*key*/ ctx[14] });
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(a);
			if (detaching && a_outro) a_outro.end();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1$1.name,
		type: "if",
		source: "(88:6) {#if !$store.enlargeDay || index !== monthIndex || !dayjs(day.date).isSame($store.selected)}",
		ctx
	});

	return block;
}

// (87:5) {#each days as day, i (day)}
function create_each_block$3(key_1, ctx) {
	let first;
	let show_if = !/*$store*/ ctx[1].enlargeDay || /*index*/ ctx[18] !== /*monthIndex*/ ctx[0] || !dayjs(/*day*/ ctx[19].date).isSame(/*$store*/ ctx[1].selected);
	let if_block_anchor;
	let if_block = show_if && create_if_block_1$1(ctx);

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			first = empty();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			this.first = first;
		},
		m: function mount(target, anchor) {
			insert_dev(target, first, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*$store, index, monthIndex, days*/ 393219) show_if = !/*$store*/ ctx[1].enlargeDay || /*index*/ ctx[18] !== /*monthIndex*/ ctx[0] || !dayjs(/*day*/ ctx[19].date).isSame(/*$store*/ ctx[1].selected);

			if (show_if) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$store, index, monthIndex, days*/ 393219) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_1$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(first);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$3.name,
		type: "each",
		source: "(87:5) {#each days as day, i (day)}",
		ctx
	});

	return block;
}

// (86:4) <Grid template="repeat(6, 1fr) / repeat(7, 1fr)">
function create_default_slot_2$1(ctx) {
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let each_value = /*days*/ ctx[17];
	validate_each_argument(each_value);
	const get_key = ctx => /*day*/ ctx[19];
	validate_each_keys(ctx, each_value, get_each_context$3, get_key);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$3(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
	}

	const block = {
		c: function create() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m: function mount(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert_dev(target, each_1_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*key, store, days, index, monthIndex, dayjs, $store, select*/ 409683) {
				each_value = /*days*/ ctx[17];
				validate_each_argument(each_value);
				validate_each_keys(ctx, each_value, get_each_context$3, get_key);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block$3, each_1_anchor, get_each_context$3);
			}
		},
		d: function destroy(detaching) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach_dev(each_1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_2$1.name,
		type: "slot",
		source: "(86:4) <Grid template=\\\"repeat(6, 1fr) / repeat(7, 1fr)\\\">",
		ctx
	});

	return block;
}

// (78:3) <InfiniteGrid     cellCount={1}     itemCount={totalMonths}     bind:index={monthIndex}     {get}     let:days     let:index    >
function create_default_slot_1$4(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				template: "repeat(6, 1fr) / repeat(7, 1fr)",
				$$slots: { default: [create_default_slot_2$1] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(grid.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(grid, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const grid_changes = {};

			if (dirty & /*$$scope, days, key, index, monthIndex, $store*/ 33964035) {
				grid_changes.$$scope = { dirty, ctx };
			}

			grid.$set(grid_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(grid.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(grid.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(grid, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1$4.name,
		type: "slot",
		source: "(78:3) <InfiniteGrid     cellCount={1}     itemCount={totalMonths}     bind:index={monthIndex}     {get}     let:days     let:index    >",
		ctx
	});

	return block;
}

// (107:2) {#if $store.enlargeDay}
function create_if_block$2(ctx) {
	let div;
	let t_value = dayjs(/*$store*/ ctx[1].selected).date() + "";
	let t;
	let div_intro;
	let div_outro;
	let current;

	const block = {
		c: function create() {
			div = element("div");
			t = text(t_value);
			attr_dev(div, "class", "stage selected-big svelte-1unzsxu");
			add_location(div, file$9, 107, 3, 3181);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if ((!current || dirty & /*$store*/ 2) && t_value !== (t_value = dayjs(/*$store*/ ctx[1].selected).date() + "")) set_data_dev(t, t_value);
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (div_outro) div_outro.end(1);
					div_intro = create_in_transition(div, /*receive*/ ctx[15], { key: /*key*/ ctx[14] });
					div_intro.start();
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (div_intro) div_intro.invalidate();

			if (local) {
				div_outro = create_out_transition(div, /*send*/ ctx[16], { key: /*key*/ ctx[14] });
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (detaching && div_outro) div_outro.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$2.name,
		type: "if",
		source: "(107:2) {#if $store.enlargeDay}",
		ctx
	});

	return block;
}

// (76:1) <Crossfade {duration} let:key let:receive let:send>
function create_default_slot$4(ctx) {
	let div;
	let infinitegrid;
	let updating_index;
	let scrollable_action;
	let t;
	let if_block_anchor;
	let current;
	let mounted;
	let dispose;

	function infinitegrid_index_binding(value) {
		/*infinitegrid_index_binding*/ ctx[11](value);
	}

	let infinitegrid_props = {
		cellCount: 1,
		itemCount: /*totalMonths*/ ctx[3],
		get: /*get*/ ctx[8],
		$$slots: {
			default: [
				create_default_slot_1$4,
				({ days, index }) => ({ 17: days, 18: index }),
				({ days, index }) => (days ? 131072 : 0) | (index ? 262144 : 0)
			]
		},
		$$scope: { ctx }
	};

	if (/*monthIndex*/ ctx[0] !== void 0) {
		infinitegrid_props.index = /*monthIndex*/ ctx[0];
	}

	infinitegrid = new InfiniteGrid({
			props: infinitegrid_props,
			$$inline: true
		});

	binding_callbacks.push(() => bind(infinitegrid, 'index', infinitegrid_index_binding));
	let if_block = /*$store*/ ctx[1].enlargeDay && create_if_block$2(ctx);

	const block = {
		c: function create() {
			div = element("div");
			create_component(infinitegrid.$$.fragment);
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr_dev(div, "class", "stage svelte-1unzsxu");
			add_location(div, file$9, 76, 2, 2242);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			mount_component(infinitegrid, div, null);
			insert_dev(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(scrollable_action = scrollable.call(null, div, { y: /*initialY*/ ctx[2], step: scrollStep })),
					listen_dev(div, "y", /*updateIndex*/ ctx[9], false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			const infinitegrid_changes = {};
			if (dirty & /*totalMonths*/ 8) infinitegrid_changes.itemCount = /*totalMonths*/ ctx[3];

			if (dirty & /*$$scope, days, key, index, monthIndex, $store*/ 33964035) {
				infinitegrid_changes.$$scope = { dirty, ctx };
			}

			if (!updating_index && dirty & /*monthIndex*/ 1) {
				updating_index = true;
				infinitegrid_changes.index = /*monthIndex*/ ctx[0];
				add_flush_callback(() => updating_index = false);
			}

			infinitegrid.$set(infinitegrid_changes);
			if (scrollable_action && is_function(scrollable_action.update) && dirty & /*initialY*/ 4) scrollable_action.update.call(null, { y: /*initialY*/ ctx[2], step: scrollStep });

			if (/*$store*/ ctx[1].enlargeDay) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$store*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(infinitegrid.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(infinitegrid.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			destroy_component(infinitegrid);
			if (detaching) detach_dev(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach_dev(if_block_anchor);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot$4.name,
		type: "slot",
		source: "(76:1) <Crossfade {duration} let:key let:receive let:send>",
		ctx
	});

	return block;
}

function create_fragment$a(ctx) {
	let keycontrols;
	let t0;
	let div1;
	let div0;
	let t1;
	let crossfade;
	let current;
	const keycontrols_spread_levels = [/*KEY_MAPPINGS*/ ctx[7], { ctx: ['days'] }];
	let keycontrols_props = {};

	for (let i = 0; i < keycontrols_spread_levels.length; i += 1) {
		keycontrols_props = assign(keycontrols_props, keycontrols_spread_levels[i]);
	}

	keycontrols = new KeyControls({ props: keycontrols_props, $$inline: true });
	let each_value_1 = /*legend*/ ctx[5];
	validate_each_argument(each_value_1);
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	crossfade = new Crossfade({
			props: {
				duration,
				$$slots: {
					default: [
						create_default_slot$4,
						({ key, receive, send }) => ({ 14: key, 15: receive, 16: send }),
						({ key, receive, send }) => (key ? 16384 : 0) | (receive ? 32768 : 0) | (send ? 65536 : 0)
					]
				},
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(keycontrols.$$.fragment);
			t0 = space();
			div1 = element("div");
			div0 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t1 = space();
			create_component(crossfade.$$.fragment);
			attr_dev(div0, "class", "legend svelte-1unzsxu");
			add_location(div0, file$9, 70, 1, 2098);
			attr_dev(div1, "class", "container svelte-1unzsxu");
			add_location(div1, file$9, 69, 0, 2073);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(keycontrols, target, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div0, null);
			}

			append_dev(div1, t1);
			mount_component(crossfade, div1, null);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const keycontrols_changes = (dirty & /*KEY_MAPPINGS*/ 128)
			? get_spread_update(keycontrols_spread_levels, [get_spread_object(/*KEY_MAPPINGS*/ ctx[7]), keycontrols_spread_levels[1]])
			: {};

			keycontrols.$set(keycontrols_changes);

			if (dirty & /*legend*/ 32) {
				each_value_1 = /*legend*/ ctx[5];
				validate_each_argument(each_value_1);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div0, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}

			const crossfade_changes = {};

			if (dirty & /*$$scope, key, $store, initialY, totalMonths, monthIndex*/ 33570831) {
				crossfade_changes.$$scope = { dirty, ctx };
			}

			crossfade.$set(crossfade_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(keycontrols.$$.fragment, local);
			transition_in(crossfade.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(keycontrols.$$.fragment, local);
			transition_out(crossfade.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(keycontrols, detaching);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div1);
			destroy_each(each_blocks, detaching);
			destroy_component(crossfade);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$a.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

const duration = 450;

function instance$a($$self, $$props, $$invalidate) {
	let totalMonths;
	let monthIndex;
	let initialY;
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('DayPicker', slots, []);
	const store = getContext(storeContextKey);
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(1, $store = value));
	const legend = Array(7).fill(0).map((d, i) => dayjs().day(($store.startOfWeekIndex + i) % 7).format('ddd'));
	const add = amount => () => store.add(amount, 'day');

	const select = day => () => {
		if (!store.isSelectable(day)) return;
		store.setDay(day || $store.selected);
		if (!$store.shouldEnlargeDay) return store.selectDay();
		store.enlargeDay();

		setTimeout(
			() => {
				store.selectDay();
				store.enlargeDay(false);
			},
			duration + 60
		);
	};

	const KEY_MAPPINGS = {
		left: add(-1),
		right: add(1),
		up: add(-7),
		down: add(7),
		enter: select(),
		escape: () => store.close()
	};

	const calPagesBetweenDates = (a, b) => {
		const yearDelta = b.getFullYear() - a.getFullYear();

		const firstPartialYear = yearDelta
		? 12 - a.getMonth()
		: b.getMonth() - a.getMonth() + 1;

		const fullYears = yearDelta > 1 ? (yearDelta - 1) * 12 : 0;
		const lastPartialYear = yearDelta ? b.getMonth() + 1 : 0;
		return firstPartialYear + fullYears + lastPartialYear;
	};

	const get = index => {
		const d = dayjs($store.start).add(index, 'month');

		return {
			days: store.getCalendarPage(d.month(), d.year())
		};
	};

	const updateIndex = ({ detail: { step: newIndex } }) => {
		store.add(newIndex - monthIndex, 'month', ['date']);
	};

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DayPicker> was created with unknown prop '${key}'`);
	});

	function keydown_handler(event) {
		bubble.call(this, $$self, event);
	}

	function infinitegrid_index_binding(value) {
		monthIndex = value;
		($$invalidate(0, monthIndex), $$invalidate(1, $store));
	}

	$$self.$capture_state = () => ({
		getContext,
		storeContextKey,
		KeyControls,
		Grid,
		InfiniteGrid,
		dayjs,
		Crossfade,
		scrollable,
		scrollStep,
		store,
		duration,
		legend,
		add,
		select,
		KEY_MAPPINGS,
		calPagesBetweenDates,
		get,
		updateIndex,
		monthIndex,
		initialY,
		totalMonths,
		$store
	});

	$$self.$inject_state = $$props => {
		if ('monthIndex' in $$props) $$invalidate(0, monthIndex = $$props.monthIndex);
		if ('initialY' in $$props) $$invalidate(2, initialY = $$props.initialY);
		if ('totalMonths' in $$props) $$invalidate(3, totalMonths = $$props.totalMonths);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$store*/ 2) {
			$$invalidate(3, totalMonths = calPagesBetweenDates($store.start, $store.end));
		}

		if ($$self.$$.dirty & /*$store*/ 2) {
			$$invalidate(0, monthIndex = calPagesBetweenDates($store.start, $store.selected) - 1);
		}

		if ($$self.$$.dirty & /*monthIndex*/ 1) {
			$$invalidate(2, initialY = monthIndex * scrollStep);
		}
	};

	return [
		monthIndex,
		$store,
		initialY,
		totalMonths,
		store,
		legend,
		select,
		KEY_MAPPINGS,
		get,
		updateIndex,
		keydown_handler,
		infinitegrid_index_binding
	];
}

class DayPicker extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DayPicker",
			options,
			id: create_fragment$a.name
		});
	}
}

/* node_modules\svelte-calendar\components\generic\ViewTransitionEffect.svelte generated by Svelte v3.49.0 */
const file$8 = "node_modules\\svelte-calendar\\components\\generic\\ViewTransitionEffect.svelte";

function create_fragment$9(ctx) {
	let div;
	let div_intro;
	let div_outro;
	let current;
	const default_slot_template = /*#slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	const block = {
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			add_location(div, file$8, 8, 0, 197);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p: function update(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null),
						null
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);

			if (local) {
				add_render_callback(() => {
					if (div_outro) div_outro.end(1);

					div_intro = create_in_transition(div, scale, {
						start: /*$store*/ ctx[0].activeViewDirection * 0.5 + 1,
						delay: 110
					});

					div_intro.start();
				});
			}

			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			if (div_intro) div_intro.invalidate();

			if (local) {
				div_outro = create_out_transition(div, scale, {
					start: /*$store*/ ctx[0].activeViewDirection * -0.5 + 1
				});
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (default_slot) default_slot.d(detaching);
			if (detaching && div_outro) div_outro.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$9.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$9($$self, $$props, $$invalidate) {
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('ViewTransitionEffect', slots, ['default']);
	const store = getContext(storeContextKey);
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(0, $store = value));
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ViewTransitionEffect> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		scale,
		storeContextKey,
		getContext,
		store,
		$store
	});

	return [$store, store, $$scope, slots];
}

class ViewTransitionEffect extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "ViewTransitionEffect",
			options,
			id: create_fragment$9.name
		});
	}
}

/* node_modules\svelte-calendar\components\generic\Arrow.svelte generated by Svelte v3.49.0 */

const file$7 = "node_modules\\svelte-calendar\\components\\generic\\Arrow.svelte";

function create_fragment$8(ctx) {
	let i;
	let i_class_value;

	const block = {
		c: function create() {
			i = element("i");
			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*dir*/ ctx[0]) + " svelte-1eiemu5"));
			add_location(i, file$7, 4, 0, 46);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, i, anchor);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*dir*/ 1 && i_class_value !== (i_class_value = "" + (null_to_empty(/*dir*/ ctx[0]) + " svelte-1eiemu5"))) {
				attr_dev(i, "class", i_class_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(i);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$8.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$8($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Arrow', slots, []);
	let { dir = 'left' } = $$props;
	const writable_props = ['dir'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Arrow> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('dir' in $$props) $$invalidate(0, dir = $$props.dir);
	};

	$$self.$capture_state = () => ({ dir });

	$$self.$inject_state = $$props => {
		if ('dir' in $$props) $$invalidate(0, dir = $$props.dir);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [dir];
}

class Arrow extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { dir: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Arrow",
			options,
			id: create_fragment$8.name
		});
	}

	get dir() {
		throw new Error("<Arrow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set dir(value) {
		throw new Error("<Arrow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* node_modules\svelte-calendar\components\calendar\CalendarControls.svelte generated by Svelte v3.49.0 */
const file$6 = "node_modules\\svelte-calendar\\components\\calendar\\CalendarControls.svelte";

function create_fragment$7(ctx) {
	let keycontrols;
	let t0;
	let div2;
	let div0;
	let arrow0;
	let t1;
	let span;
	let t2;
	let t3;
	let div1;
	let arrow1;
	let current;
	let mounted;
	let dispose;
	const keycontrols_spread_levels = [{ ctx: ['days', 'months', 'years'] }, { limit: 180 }, /*KEY_MAPPINGS*/ ctx[4]];
	let keycontrols_props = {};

	for (let i = 0; i < keycontrols_spread_levels.length; i += 1) {
		keycontrols_props = assign(keycontrols_props, keycontrols_spread_levels[i]);
	}

	keycontrols = new KeyControls({ props: keycontrols_props, $$inline: true });
	arrow0 = new Arrow({ props: { dir: "left" }, $$inline: true });
	arrow1 = new Arrow({ props: { dir: "right" }, $$inline: true });

	const block = {
		c: function create() {
			create_component(keycontrols.$$.fragment);
			t0 = space();
			div2 = element("div");
			div0 = element("div");
			create_component(arrow0.$$.fragment);
			t1 = space();
			span = element("span");
			t2 = text(/*label*/ ctx[0]);
			t3 = space();
			div1 = element("div");
			create_component(arrow1.$$.fragment);
			attr_dev(div0, "class", "button svelte-1ro74h8");
			add_location(div0, file$6, 37, 1, 1197);
			attr_dev(span, "class", "button label svelte-1ro74h8");
			add_location(span, file$6, 40, 1, 1269);
			attr_dev(div1, "class", "button svelte-1ro74h8");
			add_location(div1, file$6, 43, 1, 1345);
			attr_dev(div2, "class", "controls svelte-1ro74h8");
			add_location(div2, file$6, 36, 0, 1173);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(keycontrols, target, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div2, anchor);
			append_dev(div2, div0);
			mount_component(arrow0, div0, null);
			append_dev(div2, t1);
			append_dev(div2, span);
			append_dev(span, t2);
			append_dev(div2, t3);
			append_dev(div2, div1);
			mount_component(arrow1, div1, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(div0, "click", /*add*/ ctx[2](-1), false, false, false),
					listen_dev(span, "click", /*updateActiveView*/ ctx[3], false, false, false),
					listen_dev(div1, "click", /*add*/ ctx[2](1), false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			const keycontrols_changes = (dirty & /*KEY_MAPPINGS*/ 16)
			? get_spread_update(keycontrols_spread_levels, [
					keycontrols_spread_levels[0],
					keycontrols_spread_levels[1],
					get_spread_object(/*KEY_MAPPINGS*/ ctx[4])
				])
			: {};

			keycontrols.$set(keycontrols_changes);
			if (!current || dirty & /*label*/ 1) set_data_dev(t2, /*label*/ ctx[0]);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(keycontrols.$$.fragment, local);
			transition_in(arrow0.$$.fragment, local);
			transition_in(arrow1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(keycontrols.$$.fragment, local);
			transition_out(arrow0.$$.fragment, local);
			transition_out(arrow1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(keycontrols, detaching);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div2);
			destroy_component(arrow0);
			destroy_component(arrow1);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$7.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$7($$self, $$props, $$invalidate) {
	let visibleMonth;
	let label;
	let addMult;
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('CalendarControls', slots, []);
	const store = getContext(storeContextKey);
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(6, $store = value));

	const UNIT_BY_VIEW = {
		days: 'month',
		months: 'year',
		years: 'year'
	};

	const add = amount => () => store.add(amount * addMult, UNIT_BY_VIEW[$store.activeView]);
	const VIEW_TRANSITIONS = ['days', 'months', 'years'];

	const updateActiveView = () => {
		const transitionIndex = VIEW_TRANSITIONS.indexOf($store.activeView) + 1;

		const newView = transitionIndex
		? VIEW_TRANSITIONS[transitionIndex]
		: null;

		if (newView) store.setActiveView(newView);
	};

	const KEY_MAPPINGS = {
		pageDown: add(-1),
		pageUp: add(1),
		control: updateActiveView
	};

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CalendarControls> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({
		Arrow,
		getContext,
		storeContextKey,
		dayjs,
		KeyControls,
		store,
		UNIT_BY_VIEW,
		add,
		VIEW_TRANSITIONS,
		updateActiveView,
		KEY_MAPPINGS,
		addMult,
		visibleMonth,
		label,
		$store
	});

	$$self.$inject_state = $$props => {
		if ('addMult' in $$props) addMult = $$props.addMult;
		if ('visibleMonth' in $$props) $$invalidate(5, visibleMonth = $$props.visibleMonth);
		if ('label' in $$props) $$invalidate(0, label = $$props.label);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$store*/ 64) {
			$$invalidate(5, visibleMonth = dayjs(new Date($store.year, $store.month, 1)));
		}

		if ($$self.$$.dirty & /*$store, visibleMonth*/ 96) {
			$$invalidate(0, label = `${$store.activeView === 'days'
			? visibleMonth.format('MMMM ')
			: ''}${$store.year}`);
		}

		if ($$self.$$.dirty & /*$store*/ 64) {
			addMult = $store.activeView === 'years' ? 10 : 1;
		}
	};

	return [label, store, add, updateActiveView, KEY_MAPPINGS, visibleMonth, $store];
}

class CalendarControls extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "CalendarControls",
			options,
			id: create_fragment$7.name
		});
	}
}

/* node_modules\svelte-calendar\components\generic\crossfade\CrossfadeProvider.svelte generated by Svelte v3.49.0 */

const get_default_slot_changes$1 = dirty => ({
	key: dirty & /*$store*/ 1,
	send: dirty & /*$store*/ 1,
	receive: dirty & /*$store*/ 1
});

const get_default_slot_context$1 = ctx => ({
	key: /*$store*/ ctx[0].key,
	send: /*$store*/ ctx[0].send,
	receive: /*$store*/ ctx[0].receive
});

function create_fragment$6(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], get_default_slot_context$1);

	const block = {
		c: function create() {
			if (default_slot) default_slot.c();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope, $store*/ 5)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[2],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[2])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, get_default_slot_changes$1),
						get_default_slot_context$1
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$6.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$6($$self, $$props, $$invalidate) {
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('CrossfadeProvider', slots, ['default']);
	const noop = () => false;
	const store = getContext('crossfade') || writable({ send: noop, receive: noop });
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(0, $store = value));
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CrossfadeProvider> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		getContext,
		writable,
		noop,
		store,
		$store
	});

	return [$store, store, $$scope, slots];
}

class CrossfadeProvider extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "CrossfadeProvider",
			options,
			id: create_fragment$6.name
		});
	}
}

/* node_modules\svelte-calendar\components\calendar\MonthPicker.svelte generated by Svelte v3.49.0 */
const file$5 = "node_modules\\svelte-calendar\\components\\calendar\\MonthPicker.svelte";

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[15] = list[i];
	child_ctx[17] = i;
	return child_ctx;
}

// (63:3) {#each months as month, i}
function create_each_block$2(ctx) {
	let a;
	let t0_value = /*month*/ ctx[15].label + "";
	let t0;
	let t1;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			a = element("a");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(a, "href", "#selectMonth");
			toggle_class(a, "disabled", /*month*/ ctx[15].disabled);
			toggle_class(a, "selected", /*$store*/ ctx[1].month === /*i*/ ctx[17] && /*$store*/ ctx[1].year === /*month*/ ctx[15].year);
			add_location(a, file$5, 63, 4, 1837);
		},
		m: function mount(target, anchor) {
			insert_dev(target, a, anchor);
			append_dev(a, t0);
			append_dev(a, t1);

			if (!mounted) {
				dispose = listen_dev(
					a,
					"click",
					prevent_default(function () {
						if (is_function(/*select*/ ctx[7](/*month*/ ctx[15]))) /*select*/ ctx[7](/*month*/ ctx[15]).apply(this, arguments);
					}),
					false,
					true,
					false
				);

				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*months*/ 16384 && t0_value !== (t0_value = /*month*/ ctx[15].label + "")) set_data_dev(t0, t0_value);

			if (dirty & /*months*/ 16384) {
				toggle_class(a, "disabled", /*month*/ ctx[15].disabled);
			}

			if (dirty & /*$store, months*/ 16386) {
				toggle_class(a, "selected", /*$store*/ ctx[1].month === /*i*/ ctx[17] && /*$store*/ ctx[1].year === /*month*/ ctx[15].year);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(a);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$2.name,
		type: "each",
		source: "(63:3) {#each months as month, i}",
		ctx
	});

	return block;
}

// (62:2) <Grid template="repeat(4, 1fr) / repeat(3, 1fr)">
function create_default_slot_1$3(ctx) {
	let each_1_anchor;
	let each_value = /*months*/ ctx[14];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m: function mount(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert_dev(target, each_1_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*months, $store, select*/ 16514) {
				each_value = /*months*/ ctx[14];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach_dev(each_1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1$3.name,
		type: "slot",
		source: "(62:2) <Grid template=\\\"repeat(4, 1fr) / repeat(3, 1fr)\\\">",
		ctx
	});

	return block;
}

// (61:1) <InfiniteGrid cellCount={1} {itemCount} bind:index={yearIndex} {get} let:months bind:this={grid}>
function create_default_slot$3(ctx) {
	let grid_1;
	let current;

	grid_1 = new Grid({
			props: {
				template: "repeat(4, 1fr) / repeat(3, 1fr)",
				$$slots: { default: [create_default_slot_1$3] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(grid_1.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(grid_1, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const grid_1_changes = {};

			if (dirty & /*$$scope, months, $store*/ 278530) {
				grid_1_changes.$$scope = { dirty, ctx };
			}

			grid_1.$set(grid_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(grid_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(grid_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(grid_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot$3.name,
		type: "slot",
		source: "(61:1) <InfiniteGrid cellCount={1} {itemCount} bind:index={yearIndex} {get} let:months bind:this={grid}>",
		ctx
	});

	return block;
}

function create_fragment$5(ctx) {
	let keycontrols;
	let t;
	let div;
	let infinitegrid;
	let updating_index;
	let scrollable_action;
	let current;
	let mounted;
	let dispose;
	const keycontrols_spread_levels = [/*KEY_MAPPINGS*/ ctx[9], { ctx: ['months'] }];
	let keycontrols_props = {};

	for (let i = 0; i < keycontrols_spread_levels.length; i += 1) {
		keycontrols_props = assign(keycontrols_props, keycontrols_spread_levels[i]);
	}

	keycontrols = new KeyControls({ props: keycontrols_props, $$inline: true });

	function infinitegrid_index_binding(value) {
		/*infinitegrid_index_binding*/ ctx[10](value);
	}

	let infinitegrid_props = {
		cellCount: 1,
		itemCount: /*itemCount*/ ctx[3],
		get: /*get*/ ctx[6],
		$$slots: {
			default: [
				create_default_slot$3,
				({ months }) => ({ 14: months }),
				({ months }) => months ? 16384 : 0
			]
		},
		$$scope: { ctx }
	};

	if (/*yearIndex*/ ctx[0] !== void 0) {
		infinitegrid_props.index = /*yearIndex*/ ctx[0];
	}

	infinitegrid = new InfiniteGrid({
			props: infinitegrid_props,
			$$inline: true
		});

	binding_callbacks.push(() => bind(infinitegrid, 'index', infinitegrid_index_binding));
	/*infinitegrid_binding*/ ctx[11](infinitegrid);

	const block = {
		c: function create() {
			create_component(keycontrols.$$.fragment);
			t = space();
			div = element("div");
			create_component(infinitegrid.$$.fragment);
			attr_dev(div, "class", "svelte-t161t");
			add_location(div, file$5, 59, 0, 1555);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(keycontrols, target, anchor);
			insert_dev(target, t, anchor);
			insert_dev(target, div, anchor);
			mount_component(infinitegrid, div, null);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(scrollable_action = scrollable.call(null, div, {
						y: /*initialY*/ ctx[4],
						step: scrollStep,
						maxSteps: /*itemCount*/ ctx[3]
					})),
					listen_dev(div, "y", /*updateIndex*/ ctx[8], false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			const keycontrols_changes = (dirty & /*KEY_MAPPINGS*/ 512)
			? get_spread_update(keycontrols_spread_levels, [get_spread_object(/*KEY_MAPPINGS*/ ctx[9]), keycontrols_spread_levels[1]])
			: {};

			keycontrols.$set(keycontrols_changes);
			const infinitegrid_changes = {};
			if (dirty & /*itemCount*/ 8) infinitegrid_changes.itemCount = /*itemCount*/ ctx[3];

			if (dirty & /*$$scope, months, $store*/ 278530) {
				infinitegrid_changes.$$scope = { dirty, ctx };
			}

			if (!updating_index && dirty & /*yearIndex*/ 1) {
				updating_index = true;
				infinitegrid_changes.index = /*yearIndex*/ ctx[0];
				add_flush_callback(() => updating_index = false);
			}

			infinitegrid.$set(infinitegrid_changes);

			if (scrollable_action && is_function(scrollable_action.update) && dirty & /*initialY, itemCount*/ 24) scrollable_action.update.call(null, {
				y: /*initialY*/ ctx[4],
				step: scrollStep,
				maxSteps: /*itemCount*/ ctx[3]
			});
		},
		i: function intro(local) {
			if (current) return;
			transition_in(keycontrols.$$.fragment, local);
			transition_in(infinitegrid.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(keycontrols.$$.fragment, local);
			transition_out(infinitegrid.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(keycontrols, detaching);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(div);
			/*infinitegrid_binding*/ ctx[11](null);
			destroy_component(infinitegrid);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$5.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$5($$self, $$props, $$invalidate) {
	let yearIndex;
	let initialY;
	let itemCount;
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('MonthPicker', slots, []);
	const store = getContext(storeContextKey);
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(1, $store = value));
	let grid;

	const get = index => ({
		months: Array(12).fill(0).map((d, i) => {
			const month = dayjs(new Date($store.start.getFullYear() + index, i, 1));

			return {
				year: $store.start.getFullYear() + index,
				label: month.format('MMM'),
				index: i,
				disabled: !store.isSelectable(month, ['date'])
			};
		})
	});

	const close = () => store.setActiveView('days');

	const select = month => () => {
		if (month.disabled) return;
		store.setMonth(month.index);
		close();
	};

	const add = amount => () => {
		store.add(amount, 'month', ['date']);
	};

	const updateIndex = ({ detail: { step: newIndex } }) => {
		store.add(newIndex - yearIndex, 'year', ['month', 'date']);
	};

	const KEY_MAPPINGS = {
		left: add(-1),
		right: add(1),
		up: add(-3),
		down: add(3),
		enter: close,
		escape: close
	};

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MonthPicker> was created with unknown prop '${key}'`);
	});

	function infinitegrid_index_binding(value) {
		yearIndex = value;
		($$invalidate(0, yearIndex), $$invalidate(1, $store));
	}

	function infinitegrid_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			grid = $$value;
			$$invalidate(2, grid);
		});
	}

	$$self.$capture_state = () => ({
		getContext,
		storeContextKey,
		dayjs,
		KeyControls,
		Grid,
		InfiniteGrid,
		scrollable,
		scrollStep,
		store,
		grid,
		get,
		close,
		select,
		add,
		updateIndex,
		KEY_MAPPINGS,
		itemCount,
		yearIndex,
		initialY,
		$store
	});

	$$self.$inject_state = $$props => {
		if ('grid' in $$props) $$invalidate(2, grid = $$props.grid);
		if ('itemCount' in $$props) $$invalidate(3, itemCount = $$props.itemCount);
		if ('yearIndex' in $$props) $$invalidate(0, yearIndex = $$props.yearIndex);
		if ('initialY' in $$props) $$invalidate(4, initialY = $$props.initialY);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$store*/ 2) {
			$$invalidate(0, yearIndex = $store.year - $store.start.getFullYear());
		}

		if ($$self.$$.dirty & /*yearIndex*/ 1) {
			$$invalidate(4, initialY = yearIndex * scrollStep);
		}

		if ($$self.$$.dirty & /*$store*/ 2) {
			$$invalidate(3, itemCount = $store.end.getFullYear() - $store.start.getFullYear() + 1);
		}
	};

	return [
		yearIndex,
		$store,
		grid,
		itemCount,
		initialY,
		store,
		get,
		select,
		updateIndex,
		KEY_MAPPINGS,
		infinitegrid_index_binding,
		infinitegrid_binding
	];
}

class MonthPicker extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "MonthPicker",
			options,
			id: create_fragment$5.name
		});
	}
}

/* node_modules\svelte-calendar\components\calendar\YearPicker.svelte generated by Svelte v3.49.0 */
const file$4 = "node_modules\\svelte-calendar\\components\\calendar\\YearPicker.svelte";

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[18] = list[i];
	return child_ctx;
}

// (64:3) {#each years as year}
function create_each_block$1(ctx) {
	let a;
	let t0_value = /*year*/ ctx[18].number + "";
	let t0;
	let t1;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			a = element("a");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(a, "href", "#year");
			toggle_class(a, "selected", /*$store*/ ctx[3].year === /*year*/ ctx[18].number);
			toggle_class(a, "disabled", !/*year*/ ctx[18].selectable);
			add_location(a, file$4, 64, 4, 2010);
		},
		m: function mount(target, anchor) {
			insert_dev(target, a, anchor);
			append_dev(a, t0);
			append_dev(a, t1);

			if (!mounted) {
				dispose = listen_dev(
					a,
					"click",
					prevent_default(function () {
						if (is_function(/*select*/ ctx[10](/*year*/ ctx[18]))) /*select*/ ctx[10](/*year*/ ctx[18]).apply(this, arguments);
					}),
					false,
					true,
					false
				);

				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*years*/ 131072 && t0_value !== (t0_value = /*year*/ ctx[18].number + "")) set_data_dev(t0, t0_value);

			if (dirty & /*$store, years*/ 131080) {
				toggle_class(a, "selected", /*$store*/ ctx[3].year === /*year*/ ctx[18].number);
			}

			if (dirty & /*years*/ 131072) {
				toggle_class(a, "disabled", !/*year*/ ctx[18].selectable);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(a);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$1.name,
		type: "each",
		source: "(64:3) {#each years as year}",
		ctx
	});

	return block;
}

// (63:2) <Grid template="repeat({rowCount}, 1fr) / repeat({colCount}, 1fr)">
function create_default_slot_1$2(ctx) {
	let each_1_anchor;
	let each_value = /*years*/ ctx[17];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m: function mount(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert_dev(target, each_1_anchor, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*$store, years, select*/ 132104) {
				each_value = /*years*/ ctx[17];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach_dev(each_1_anchor);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1$2.name,
		type: "slot",
		source: "(63:2) <Grid template=\\\"repeat({rowCount}, 1fr) / repeat({colCount}, 1fr)\\\">",
		ctx
	});

	return block;
}

// (62:1) <InfiniteGrid cellCount={1} {itemCount} bind:index={yearIndex} {get} let:years>
function create_default_slot$2(ctx) {
	let grid;
	let current;

	grid = new Grid({
			props: {
				template: "repeat(" + /*rowCount*/ ctx[0] + ", 1fr) / repeat(" + /*colCount*/ ctx[1] + ", 1fr)",
				$$slots: { default: [create_default_slot_1$2] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(grid.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(grid, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const grid_changes = {};
			if (dirty & /*rowCount, colCount*/ 3) grid_changes.template = "repeat(" + /*rowCount*/ ctx[0] + ", 1fr) / repeat(" + /*colCount*/ ctx[1] + ", 1fr)";

			if (dirty & /*$$scope, years, $store*/ 2228232) {
				grid_changes.$$scope = { dirty, ctx };
			}

			grid.$set(grid_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(grid.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(grid.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(grid, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot$2.name,
		type: "slot",
		source: "(62:1) <InfiniteGrid cellCount={1} {itemCount} bind:index={yearIndex} {get} let:years>",
		ctx
	});

	return block;
}

function create_fragment$4(ctx) {
	let keycontrols;
	let t;
	let div;
	let infinitegrid;
	let updating_index;
	let scrollable_action;
	let current;
	let mounted;
	let dispose;
	const keycontrols_spread_levels = [/*KEY_MAPPINGS*/ ctx[6], { ctx: ['years'] }];
	let keycontrols_props = {};

	for (let i = 0; i < keycontrols_spread_levels.length; i += 1) {
		keycontrols_props = assign(keycontrols_props, keycontrols_spread_levels[i]);
	}

	keycontrols = new KeyControls({ props: keycontrols_props, $$inline: true });

	function infinitegrid_index_binding(value) {
		/*infinitegrid_index_binding*/ ctx[14](value);
	}

	let infinitegrid_props = {
		cellCount: 1,
		itemCount: /*itemCount*/ ctx[5],
		get: /*get*/ ctx[8],
		$$slots: {
			default: [
				create_default_slot$2,
				({ years }) => ({ 17: years }),
				({ years }) => years ? 131072 : 0
			]
		},
		$$scope: { ctx }
	};

	if (/*yearIndex*/ ctx[2] !== void 0) {
		infinitegrid_props.index = /*yearIndex*/ ctx[2];
	}

	infinitegrid = new InfiniteGrid({
			props: infinitegrid_props,
			$$inline: true
		});

	binding_callbacks.push(() => bind(infinitegrid, 'index', infinitegrid_index_binding));

	const block = {
		c: function create() {
			create_component(keycontrols.$$.fragment);
			t = space();
			div = element("div");
			create_component(infinitegrid.$$.fragment);
			attr_dev(div, "class", "svelte-t161t");
			add_location(div, file$4, 60, 0, 1733);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(keycontrols, target, anchor);
			insert_dev(target, t, anchor);
			insert_dev(target, div, anchor);
			mount_component(infinitegrid, div, null);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(scrollable_action = scrollable.call(null, div, {
						y: /*initialY*/ ctx[4],
						step: scrollStep,
						maxSteps: /*itemCount*/ ctx[5]
					})),
					listen_dev(div, "y", /*updateIndex*/ ctx[9], false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			const keycontrols_changes = (dirty & /*KEY_MAPPINGS*/ 64)
			? get_spread_update(keycontrols_spread_levels, [get_spread_object(/*KEY_MAPPINGS*/ ctx[6]), keycontrols_spread_levels[1]])
			: {};

			keycontrols.$set(keycontrols_changes);
			const infinitegrid_changes = {};
			if (dirty & /*itemCount*/ 32) infinitegrid_changes.itemCount = /*itemCount*/ ctx[5];

			if (dirty & /*$$scope, rowCount, colCount, years, $store*/ 2228235) {
				infinitegrid_changes.$$scope = { dirty, ctx };
			}

			if (!updating_index && dirty & /*yearIndex*/ 4) {
				updating_index = true;
				infinitegrid_changes.index = /*yearIndex*/ ctx[2];
				add_flush_callback(() => updating_index = false);
			}

			infinitegrid.$set(infinitegrid_changes);

			if (scrollable_action && is_function(scrollable_action.update) && dirty & /*initialY, itemCount*/ 48) scrollable_action.update.call(null, {
				y: /*initialY*/ ctx[4],
				step: scrollStep,
				maxSteps: /*itemCount*/ ctx[5]
			});
		},
		i: function intro(local) {
			if (current) return;
			transition_in(keycontrols.$$.fragment, local);
			transition_in(infinitegrid.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(keycontrols.$$.fragment, local);
			transition_out(infinitegrid.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(keycontrols, detaching);
			if (detaching) detach_dev(t);
			if (detaching) detach_dev(div);
			destroy_component(infinitegrid);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$4.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$4($$self, $$props, $$invalidate) {
	let KEY_MAPPINGS;
	let startYear;
	let endYear;
	let numPerPage;
	let itemCount;
	let yearIndex;
	let initialY;
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('YearPicker', slots, []);
	let { rowCount = 3 } = $$props;
	let { colCount = 3 } = $$props;
	const store = getContext(storeContextKey);
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(3, $store = value));
	const close = () => store.setActiveView('months');

	const add = amount => () => {
		const result = $store.year + amount;
		if (result < startYear || result > endYear) return;
		store.add(amount, 'year', ['month', 'date']);
	};

	const get = index => {
		const firstYear = startYear + index * numPerPage;

		return {
			years: Array(numPerPage).fill(0).map((d, i) => ({
				number: firstYear + i,
				selectable: firstYear + i <= endYear
			}))
		};
	};

	const updateIndex = ({ detail: { step: newIndex } }) => {
		store.add(numPerPage * (newIndex - yearIndex), 'year', ['year', 'month', 'date']);
	};

	const select = year => () => {
		if (!year.selectable) return;
		store.setYear(year.number);
		close();
	};

	const writable_props = ['rowCount', 'colCount'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<YearPicker> was created with unknown prop '${key}'`);
	});

	function infinitegrid_index_binding(value) {
		yearIndex = value;
		((((($$invalidate(2, yearIndex), $$invalidate(3, $store)), $$invalidate(12, startYear)), $$invalidate(11, numPerPage)), $$invalidate(0, rowCount)), $$invalidate(1, colCount));
	}

	$$self.$$set = $$props => {
		if ('rowCount' in $$props) $$invalidate(0, rowCount = $$props.rowCount);
		if ('colCount' in $$props) $$invalidate(1, colCount = $$props.colCount);
	};

	$$self.$capture_state = () => ({
		getContext,
		storeContextKey,
		KeyControls,
		Grid,
		InfiniteGrid,
		scrollable,
		scrollStep,
		rowCount,
		colCount,
		store,
		close,
		add,
		get,
		updateIndex,
		select,
		yearIndex,
		initialY,
		numPerPage,
		startYear,
		endYear,
		itemCount,
		KEY_MAPPINGS,
		$store
	});

	$$self.$inject_state = $$props => {
		if ('rowCount' in $$props) $$invalidate(0, rowCount = $$props.rowCount);
		if ('colCount' in $$props) $$invalidate(1, colCount = $$props.colCount);
		if ('yearIndex' in $$props) $$invalidate(2, yearIndex = $$props.yearIndex);
		if ('initialY' in $$props) $$invalidate(4, initialY = $$props.initialY);
		if ('numPerPage' in $$props) $$invalidate(11, numPerPage = $$props.numPerPage);
		if ('startYear' in $$props) $$invalidate(12, startYear = $$props.startYear);
		if ('endYear' in $$props) $$invalidate(13, endYear = $$props.endYear);
		if ('itemCount' in $$props) $$invalidate(5, itemCount = $$props.itemCount);
		if ('KEY_MAPPINGS' in $$props) $$invalidate(6, KEY_MAPPINGS = $$props.KEY_MAPPINGS);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*colCount*/ 2) {
			$$invalidate(6, KEY_MAPPINGS = {
				up: add(-1 * colCount),
				down: add(colCount),
				left: add(-1),
				right: add(1),
				enter: close,
				escape: close
			});
		}

		if ($$self.$$.dirty & /*$store*/ 8) {
			$$invalidate(12, startYear = $store.start.getFullYear());
		}

		if ($$self.$$.dirty & /*$store*/ 8) {
			$$invalidate(13, endYear = $store.end.getFullYear());
		}

		if ($$self.$$.dirty & /*rowCount, colCount*/ 3) {
			$$invalidate(11, numPerPage = rowCount * colCount);
		}

		if ($$self.$$.dirty & /*endYear, startYear, numPerPage*/ 14336) {
			$$invalidate(5, itemCount = Math.ceil(endYear - startYear + 1) / numPerPage);
		}

		if ($$self.$$.dirty & /*$store, startYear, numPerPage*/ 6152) {
			$$invalidate(2, yearIndex = Math.floor(($store.year - startYear) / numPerPage));
		}

		if ($$self.$$.dirty & /*yearIndex*/ 4) {
			$$invalidate(4, initialY = yearIndex * scrollStep);
		}
	};

	return [
		rowCount,
		colCount,
		yearIndex,
		$store,
		initialY,
		itemCount,
		KEY_MAPPINGS,
		store,
		get,
		updateIndex,
		select,
		numPerPage,
		startYear,
		endYear,
		infinitegrid_index_binding
	];
}

class YearPicker extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$4, create_fragment$4, safe_not_equal, { rowCount: 0, colCount: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "YearPicker",
			options,
			id: create_fragment$4.name
		});
	}

	get rowCount() {
		throw new Error("<YearPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set rowCount(value) {
		throw new Error("<YearPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get colCount() {
		throw new Error("<YearPicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set colCount(value) {
		throw new Error("<YearPicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* node_modules\svelte-calendar\components\calendar\Calendar.svelte generated by Svelte v3.49.0 */
const file$3 = "node_modules\\svelte-calendar\\components\\calendar\\Calendar.svelte";

// (26:43) 
function create_if_block_2(ctx) {
	let viewtransitioneffect;
	let current;

	viewtransitioneffect = new ViewTransitionEffect({
			props: {
				$$slots: { default: [create_default_slot_3] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(viewtransitioneffect.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(viewtransitioneffect, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(viewtransitioneffect.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(viewtransitioneffect.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(viewtransitioneffect, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2.name,
		type: "if",
		source: "(26:43) ",
		ctx
	});

	return block;
}

// (22:44) 
function create_if_block_1(ctx) {
	let viewtransitioneffect;
	let current;

	viewtransitioneffect = new ViewTransitionEffect({
			props: {
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(viewtransitioneffect.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(viewtransitioneffect, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(viewtransitioneffect.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(viewtransitioneffect.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(viewtransitioneffect, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(22:44) ",
		ctx
	});

	return block;
}

// (18:3) {#if $store.activeView === 'days'}
function create_if_block$1(ctx) {
	let viewtransitioneffect;
	let current;

	viewtransitioneffect = new ViewTransitionEffect({
			props: {
				$$slots: { default: [create_default_slot_1$1] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(viewtransitioneffect.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(viewtransitioneffect, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(viewtransitioneffect.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(viewtransitioneffect.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(viewtransitioneffect, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(18:3) {#if $store.activeView === 'days'}",
		ctx
	});

	return block;
}

// (27:4) <ViewTransitionEffect>
function create_default_slot_3(ctx) {
	let yearpicker;
	let current;
	yearpicker = new YearPicker({ $$inline: true });

	const block = {
		c: function create() {
			create_component(yearpicker.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(yearpicker, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(yearpicker.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(yearpicker.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(yearpicker, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_3.name,
		type: "slot",
		source: "(27:4) <ViewTransitionEffect>",
		ctx
	});

	return block;
}

// (23:4) <ViewTransitionEffect>
function create_default_slot_2(ctx) {
	let monthpicker;
	let current;
	monthpicker = new MonthPicker({ $$inline: true });

	const block = {
		c: function create() {
			create_component(monthpicker.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(monthpicker, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(monthpicker.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(monthpicker.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(monthpicker, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_2.name,
		type: "slot",
		source: "(23:4) <ViewTransitionEffect>",
		ctx
	});

	return block;
}

// (19:4) <ViewTransitionEffect>
function create_default_slot_1$1(ctx) {
	let daypicker;
	let current;
	daypicker = new DayPicker({ $$inline: true });

	const block = {
		c: function create() {
			create_component(daypicker.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(daypicker, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(daypicker.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(daypicker.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(daypicker, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1$1.name,
		type: "slot",
		source: "(19:4) <ViewTransitionEffect>",
		ctx
	});

	return block;
}

// (14:0) <CrossfadeProvider let:key let:send let:receive>
function create_default_slot$1(ctx) {
	let div1;
	let datepickercontrols;
	let t;
	let div0;
	let current_block_type_index;
	let if_block;
	let div1_intro;
	let div1_outro;
	let current;
	datepickercontrols = new CalendarControls({ $$inline: true });
	const if_block_creators = [create_if_block$1, create_if_block_1, create_if_block_2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*$store*/ ctx[0].activeView === 'days') return 0;
		if (/*$store*/ ctx[0].activeView === 'months') return 1;
		if (/*$store*/ ctx[0].activeView === 'years') return 2;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	const block = {
		c: function create() {
			div1 = element("div");
			create_component(datepickercontrols.$$.fragment);
			t = space();
			div0 = element("div");
			if (if_block) if_block.c();
			attr_dev(div0, "class", "contents svelte-126ec0f");
			add_location(div0, file$3, 16, 2, 783);
			attr_dev(div1, "class", "grid svelte-126ec0f");
			add_location(div1, file$3, 14, 1, 685);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			mount_component(datepickercontrols, div1, null);
			append_dev(div1, t);
			append_dev(div1, div0);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(div0, null);
			}

			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index !== previous_block_index) {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}

					transition_in(if_block, 1);
					if_block.m(div0, null);
				} else {
					if_block = null;
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(datepickercontrols.$$.fragment, local);
			transition_in(if_block);

			if (local) {
				add_render_callback(() => {
					if (div1_outro) div1_outro.end(1);
					div1_intro = create_in_transition(div1, /*receive*/ ctx[4], { key: /*key*/ ctx[2] });
					div1_intro.start();
				});
			}

			current = true;
		},
		o: function outro(local) {
			transition_out(datepickercontrols.$$.fragment, local);
			transition_out(if_block);
			if (div1_intro) div1_intro.invalidate();

			if (local) {
				div1_outro = create_out_transition(div1, /*send*/ ctx[3], { key: /*key*/ ctx[2] });
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div1);
			destroy_component(datepickercontrols);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d();
			}

			if (detaching && div1_outro) div1_outro.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot$1.name,
		type: "slot",
		source: "(14:0) <CrossfadeProvider let:key let:send let:receive>",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let crossfadeprovider;
	let current;

	crossfadeprovider = new CrossfadeProvider({
			props: {
				$$slots: {
					default: [
						create_default_slot$1,
						({ key, send, receive }) => ({ 2: key, 3: send, 4: receive }),
						({ key, send, receive }) => (key ? 4 : 0) | (send ? 8 : 0) | (receive ? 16 : 0)
					]
				},
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(crossfadeprovider.$$.fragment);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(crossfadeprovider, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const crossfadeprovider_changes = {};

			if (dirty & /*$$scope, key, $store*/ 37) {
				crossfadeprovider_changes.$$scope = { dirty, ctx };
			}

			crossfadeprovider.$set(crossfadeprovider_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(crossfadeprovider.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(crossfadeprovider.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(crossfadeprovider, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
	let $store;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Calendar', slots, []);
	const store = getContext(storeContextKey);
	validate_store(store, 'store');
	component_subscribe($$self, store, value => $$invalidate(0, $store = value));
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Calendar> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({
		DayPicker,
		ViewTransitionEffect,
		DatepickerControls: CalendarControls,
		getContext,
		storeContextKey,
		CrossfadeProvider,
		MonthPicker,
		YearPicker,
		store,
		$store
	});

	return [$store, store];
}

class Calendar extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Calendar",
			options,
			id: create_fragment$3.name
		});
	}
}

const calendar = {
	selected: new Date(),
	start: dayjs().add(-100, 'year').toDate(),
	end: dayjs().add(100, 'year').toDate(),
	format: 'MM/DD/YYYY'
};

/* node_modules\svelte-calendar\components\Datepicker.svelte generated by Svelte v3.49.0 */
const file$2 = "node_modules\\svelte-calendar\\components\\Datepicker.svelte";

const get_default_slot_changes = dirty => ({
	key: dirty & /*key*/ 16384,
	send: dirty & /*send*/ 32768,
	receive: dirty & /*receive*/ 65536,
	formatted: dirty & /*formatted*/ 1
});

const get_default_slot_context = ctx => ({
	key: /*key*/ ctx[14],
	send: /*send*/ ctx[15],
	receive: /*receive*/ ctx[16],
	formatted: /*formatted*/ ctx[0]
});

// (41:43)     
function fallback_block(ctx) {
	let div;
	let button;
	let button_intro;
	let button_outro;
	let t0;
	let span;
	let t1;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			div = element("div");
			button = element("button");
			t0 = space();
			span = element("span");
			t1 = text(/*formatted*/ ctx[0]);
			attr_dev(button, "class", "svelte-18igz6t");
			add_location(button, file$2, 42, 4, 1358);
			attr_dev(span, "class", "button-text svelte-18igz6t");
			add_location(span, file$2, 43, 4, 1425);
			attr_dev(div, "class", "button-container svelte-18igz6t");
			add_location(div, file$2, 41, 3, 1323);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			append_dev(div, t0);
			append_dev(div, span);
			append_dev(span, t1);
			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (!current || dirty & /*formatted*/ 1) set_data_dev(t1, /*formatted*/ ctx[0]);
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (button_outro) button_outro.end(1);
					button_intro = create_in_transition(button, /*receive*/ ctx[16], { key: /*key*/ ctx[14] });
					button_intro.start();
				});
			}

			if (local) {
				add_render_callback(() => {
					if (!span_transition) span_transition = create_bidirectional_transition(span, fade, { delay: 150 }, true);
					span_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (button_intro) button_intro.invalidate();

			if (local) {
				button_outro = create_out_transition(button, /*send*/ ctx[15], { key: /*key*/ ctx[14] });
			}

			if (local) {
				if (!span_transition) span_transition = create_bidirectional_transition(span, fade, { delay: 150 }, false);
				span_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (detaching && button_outro) button_outro.end();
			if (detaching && span_transition) span_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: fallback_block.name,
		type: "fallback",
		source: "(41:43)     ",
		ctx
	});

	return block;
}

// (40:1) <Popover {style} let:key let:send let:receive bind:isOpen={$store.open}>
function create_default_slot_1(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[10].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], get_default_slot_context);
	const default_slot_or_fallback = default_slot || fallback_block(ctx);

	const block = {
		c: function create() {
			if (default_slot_or_fallback) default_slot_or_fallback.c();
		},
		m: function mount(target, anchor) {
			if (default_slot_or_fallback) {
				default_slot_or_fallback.m(target, anchor);
			}

			current = true;
		},
		p: function update(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope, key, send, receive, formatted*/ 118785)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[12],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[12])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[12], dirty, get_default_slot_changes),
						get_default_slot_context
					);
				}
			} else {
				if (default_slot_or_fallback && default_slot_or_fallback.p && (!current || dirty & /*formatted, key*/ 16385)) {
					default_slot_or_fallback.p(ctx, !current ? -1 : dirty);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot_or_fallback, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot_or_fallback, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1.name,
		type: "slot",
		source: "(40:1) <Popover {style} let:key let:send let:receive bind:isOpen={$store.open}>",
		ctx
	});

	return block;
}

// (47:2) <svelte:fragment slot="contents">
function create_contents_slot(ctx) {
	let calendar;
	let current;
	calendar = new Calendar({ $$inline: true });

	const block = {
		c: function create() {
			create_component(calendar.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(calendar, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(calendar.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(calendar.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(calendar, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_contents_slot.name,
		type: "slot",
		source: "(47:2) <svelte:fragment slot=\\\"contents\\\">",
		ctx
	});

	return block;
}

// (39:0) <Theme {defaultTheme} {theme} let:style>
function create_default_slot(ctx) {
	let popover;
	let updating_isOpen;
	let current;

	function popover_isOpen_binding(value) {
		/*popover_isOpen_binding*/ ctx[11](value);
	}

	let popover_props = {
		style: /*style*/ ctx[13],
		$$slots: {
			contents: [
				create_contents_slot,
				({ key, send, receive }) => ({ 14: key, 15: send, 16: receive }),
				({ key, send, receive }) => (key ? 16384 : 0) | (send ? 32768 : 0) | (receive ? 65536 : 0)
			],
			default: [
				create_default_slot_1,
				({ key, send, receive }) => ({ 14: key, 15: send, 16: receive }),
				({ key, send, receive }) => (key ? 16384 : 0) | (send ? 32768 : 0) | (receive ? 65536 : 0)
			]
		},
		$$scope: { ctx }
	};

	if (/*$store*/ ctx[4].open !== void 0) {
		popover_props.isOpen = /*$store*/ ctx[4].open;
	}

	popover = new Popover({ props: popover_props, $$inline: true });
	binding_callbacks.push(() => bind(popover, 'isOpen', popover_isOpen_binding));

	const block = {
		c: function create() {
			create_component(popover.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(popover, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const popover_changes = {};
			if (dirty & /*style*/ 8192) popover_changes.style = /*style*/ ctx[13];

			if (dirty & /*$$scope, formatted, key, send, receive*/ 118785) {
				popover_changes.$$scope = { dirty, ctx };
			}

			if (!updating_isOpen && dirty & /*$store*/ 16) {
				updating_isOpen = true;
				popover_changes.isOpen = /*$store*/ ctx[4].open;
				add_flush_callback(() => updating_isOpen = false);
			}

			popover.$set(popover_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(popover.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(popover.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(popover, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot.name,
		type: "slot",
		source: "(39:0) <Theme {defaultTheme} {theme} let:style>",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let theme_1;
	let current;

	theme_1 = new Theme({
			props: {
				defaultTheme: /*defaultTheme*/ ctx[2],
				theme: /*theme*/ ctx[1],
				$$slots: {
					default: [
						create_default_slot,
						({ style }) => ({ 13: style }),
						({ style }) => style ? 8192 : 0
					]
				},
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(theme_1.$$.fragment);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(theme_1, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const theme_1_changes = {};
			if (dirty & /*defaultTheme*/ 4) theme_1_changes.defaultTheme = /*defaultTheme*/ ctx[2];
			if (dirty & /*theme*/ 2) theme_1_changes.theme = /*theme*/ ctx[1];

			if (dirty & /*$$scope, style, $store, formatted*/ 12305) {
				theme_1_changes.$$scope = { dirty, ctx };
			}

			theme_1.$set(theme_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(theme_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(theme_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(theme_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(4, $store = $$value)), store);

	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Datepicker', slots, ['default']);
	let { selected = calendar.selected } = $$props;
	let { start = calendar.start } = $$props;
	let { end = calendar.end } = $$props;
	let { format = calendar.format } = $$props;
	let { formatted = '' } = $$props;
	let { theme = {} } = $$props;
	let { defaultTheme = undefined } = $$props;
	let { startOfWeekIndex = 0 } = $$props;

	let { store = datepickerStore.get({
		selected,
		start,
		end,
		shouldEnlargeDay: true,
		startOfWeekIndex
	}) } = $$props;

	validate_store(store, 'store');
	$$subscribe_store();
	setContext(storeContextKey, store);
	setContext(keyControlsContextKey, derived(store, $s => $s.activeView));

	const writable_props = [
		'selected',
		'start',
		'end',
		'format',
		'formatted',
		'theme',
		'defaultTheme',
		'startOfWeekIndex',
		'store'
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Datepicker> was created with unknown prop '${key}'`);
	});

	function popover_isOpen_binding(value) {
		if ($$self.$$.not_equal($store.open, value)) {
			$store.open = value;
			store.set($store);
		}
	}

	$$self.$$set = $$props => {
		if ('selected' in $$props) $$invalidate(5, selected = $$props.selected);
		if ('start' in $$props) $$invalidate(6, start = $$props.start);
		if ('end' in $$props) $$invalidate(7, end = $$props.end);
		if ('format' in $$props) $$invalidate(8, format = $$props.format);
		if ('formatted' in $$props) $$invalidate(0, formatted = $$props.formatted);
		if ('theme' in $$props) $$invalidate(1, theme = $$props.theme);
		if ('defaultTheme' in $$props) $$invalidate(2, defaultTheme = $$props.defaultTheme);
		if ('startOfWeekIndex' in $$props) $$invalidate(9, startOfWeekIndex = $$props.startOfWeekIndex);
		if ('store' in $$props) $$subscribe_store($$invalidate(3, store = $$props.store));
		if ('$$scope' in $$props) $$invalidate(12, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		dayjs,
		datepickerStore,
		keyControlsContextKey,
		storeContextKey,
		setContext,
		derived,
		Popover,
		Theme,
		Calendar,
		fade,
		calendarDefaults: calendar,
		selected,
		start,
		end,
		format,
		formatted,
		theme,
		defaultTheme,
		startOfWeekIndex,
		store,
		$store
	});

	$$self.$inject_state = $$props => {
		if ('selected' in $$props) $$invalidate(5, selected = $$props.selected);
		if ('start' in $$props) $$invalidate(6, start = $$props.start);
		if ('end' in $$props) $$invalidate(7, end = $$props.end);
		if ('format' in $$props) $$invalidate(8, format = $$props.format);
		if ('formatted' in $$props) $$invalidate(0, formatted = $$props.formatted);
		if ('theme' in $$props) $$invalidate(1, theme = $$props.theme);
		if ('defaultTheme' in $$props) $$invalidate(2, defaultTheme = $$props.defaultTheme);
		if ('startOfWeekIndex' in $$props) $$invalidate(9, startOfWeekIndex = $$props.startOfWeekIndex);
		if ('store' in $$props) $$subscribe_store($$invalidate(3, store = $$props.store));
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$store*/ 16) {
			$$invalidate(5, selected = $store.selected);
		}

		if ($$self.$$.dirty & /*selected, format*/ 288) {
			$$invalidate(0, formatted = dayjs(selected).format(format));
		}
	};

	return [
		formatted,
		theme,
		defaultTheme,
		store,
		$store,
		selected,
		start,
		end,
		format,
		startOfWeekIndex,
		slots,
		popover_isOpen_binding,
		$$scope
	];
}

class Datepicker extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			selected: 5,
			start: 6,
			end: 7,
			format: 8,
			formatted: 0,
			theme: 1,
			defaultTheme: 2,
			startOfWeekIndex: 9,
			store: 3
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Datepicker",
			options,
			id: create_fragment$2.name
		});
	}

	get selected() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set selected(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get start() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set start(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get end() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set end(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get format() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set format(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get formatted() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set formatted(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get theme() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set theme(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get defaultTheme() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set defaultTheme(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get startOfWeekIndex() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set startOfWeekIndex(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get store() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set store(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

function daysSince(from, to=Date.now()){
  const diff = to - from;
  const secs= diff/1000;
  const mins= secs/60;
  const hours = mins/60;
  const days = hours/24;
  const weeks = days/7;

  return { secs, mins, hours, days, weeks };
}

/* src\apps\dateUtil\DateUtil.svelte generated by Svelte v3.49.0 */

const { Object: Object_1 } = globals;
const file$1 = "src\\apps\\dateUtil\\DateUtil.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	return child_ctx;
}

// (30:1) {#if $store?.selected}
function create_if_block(ctx) {
	let table;
	let each_value = Object.keys(/*$selected*/ ctx[3]);
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			table = element("table");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(table, "class", "svelte-14fu0pl");
			add_location(table, file$1, 30, 2, 608);
		},
		m: function mount(target, anchor) {
			insert_dev(target, table, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(table, null);
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*parseInt, $selected, Object*/ 8) {
				each_value = Object.keys(/*$selected*/ ctx[3]);
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(table, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(table);
			destroy_each(each_blocks, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(30:1) {#if $store?.selected}",
		ctx
	});

	return block;
}

// (32:2) {#each Object.keys($selected) as key}
function create_each_block(ctx) {
	let tr;
	let td0;
	let t0_value = /*key*/ ctx[7] + "";
	let t0;
	let t1;
	let td1;
	let t2_value = parseInt(/*$selected*/ ctx[3][/*key*/ ctx[7]]) + "";
	let t2;

	const block = {
		c: function create() {
			tr = element("tr");
			td0 = element("td");
			t0 = text(t0_value);
			t1 = text(":");
			td1 = element("td");
			t2 = text(t2_value);
			attr_dev(td0, "class", "svelte-14fu0pl");
			add_location(td0, file$1, 32, 7, 665);
			attr_dev(td1, "class", "svelte-14fu0pl");
			add_location(td1, file$1, 32, 22, 680);
			attr_dev(tr, "class", "svelte-14fu0pl");
			add_location(tr, file$1, 32, 3, 661);
		},
		m: function mount(target, anchor) {
			insert_dev(target, tr, anchor);
			append_dev(tr, td0);
			append_dev(td0, t0);
			append_dev(td0, t1);
			append_dev(tr, td1);
			append_dev(td1, t2);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*$selected*/ 8 && t0_value !== (t0_value = /*key*/ ctx[7] + "")) set_data_dev(t0, t0_value);
			if (dirty & /*$selected*/ 8 && t2_value !== (t2_value = parseInt(/*$selected*/ ctx[3][/*key*/ ctx[7]]) + "")) set_data_dev(t2, t2_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(tr);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(32:2) {#each Object.keys($selected) as key}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let main;
	let span;
	let t1;
	let datepicker;
	let updating_store;
	let t2;
	let current;

	function datepicker_store_binding(value) {
		/*datepicker_store_binding*/ ctx[5](value);
	}

	let datepicker_props = { theme: /*theme*/ ctx[4] };

	if (/*store*/ ctx[0] !== void 0) {
		datepicker_props.store = /*store*/ ctx[0];
	}

	datepicker = new Datepicker({ props: datepicker_props, $$inline: true });
	binding_callbacks.push(() => bind(datepicker, 'store', datepicker_store_binding));
	let if_block = /*$store*/ ctx[2]?.selected && create_if_block(ctx);

	const block = {
		c: function create() {
			main = element("main");
			span = element("span");
			span.textContent = "Days Since:";
			t1 = space();
			create_component(datepicker.$$.fragment);
			t2 = space();
			if (if_block) if_block.c();
			add_location(span, file$1, 26, 1, 517);
			attr_dev(main, "class", "svelte-14fu0pl");
			add_location(main, file$1, 25, 0, 508);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, main, anchor);
			append_dev(main, span);
			append_dev(main, t1);
			mount_component(datepicker, main, null);
			append_dev(main, t2);
			if (if_block) if_block.m(main, null);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const datepicker_changes = {};

			if (!updating_store && dirty & /*store*/ 1) {
				updating_store = true;
				datepicker_changes.store = /*store*/ ctx[0];
				add_flush_callback(() => updating_store = false);
			}

			datepicker.$set(datepicker_changes);

			if (/*$store*/ ctx[2]?.selected) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(main, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(datepicker.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(datepicker.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(main);
			destroy_component(datepicker);
			if (if_block) if_block.d();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(2, $store = $$value)), store);

	let $selected,
		$$unsubscribe_selected = noop,
		$$subscribe_selected = () => ($$unsubscribe_selected(), $$unsubscribe_selected = subscribe(selected, $$value => $$invalidate(3, $selected = $$value)), selected);

	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	$$self.$$.on_destroy.push(() => $$unsubscribe_selected());
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('DateUtil', slots, []);

	const theme = {
		calendar: {
			width: '600px',
			shadow: '0px 0px 5px rgba(0, 0, 0, 0.25)'
		}
	};

	const start = new Date('1970-01-01');
	let store;
	let selected;

	onMount(() => {
		$$subscribe_selected($$invalidate(1, selected = derived(store, $store => ($store?.selected)
		? daysSince($store.selected.getTime())
		: {})));
	});

	const writable_props = [];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DateUtil> was created with unknown prop '${key}'`);
	});

	function datepicker_store_binding(value) {
		store = value;
		$$subscribe_store($$invalidate(0, store));
	}

	$$self.$capture_state = () => ({
		onMount,
		derived,
		Datepicker,
		daysSince,
		theme,
		start,
		store,
		selected,
		$store,
		$selected
	});

	$$self.$inject_state = $$props => {
		if ('store' in $$props) $$subscribe_store($$invalidate(0, store = $$props.store));
		if ('selected' in $$props) $$subscribe_selected($$invalidate(1, selected = $$props.selected));
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [store, selected, $store, $selected, theme, datepicker_store_binding];
}

class DateUtil extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DateUtil",
			options,
			id: create_fragment$1.name
		});
	}
}

/* src\layout\Page.svelte generated by Svelte v3.49.0 */
const file = "src\\layout\\Page.svelte";

function create_fragment(ctx) {
	let main;
	let header;
	let t0;
	let div1;
	let menu;
	let t1;
	let div0;
	let dateutil;
	let current;
	header = new Header({ $$inline: true });
	menu = new Menu({ $$inline: true });
	dateutil = new DateUtil({ $$inline: true });

	const block = {
		c: function create() {
			main = element("main");
			create_component(header.$$.fragment);
			t0 = space();
			div1 = element("div");
			create_component(menu.$$.fragment);
			t1 = space();
			div0 = element("div");
			create_component(dateutil.$$.fragment);
			attr_dev(div0, "id", "content");
			attr_dev(div0, "class", "svelte-75i1py");
			add_location(div0, file, 9, 8, 243);
			attr_dev(div1, "id", "main-content");
			attr_dev(div1, "class", "svelte-75i1py");
			add_location(div1, file, 7, 4, 193);
			attr_dev(main, "class", "svelte-75i1py");
			add_location(main, file, 5, 0, 165);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, main, anchor);
			mount_component(header, main, null);
			append_dev(main, t0);
			append_dev(main, div1);
			mount_component(menu, div1, null);
			append_dev(div1, t1);
			append_dev(div1, div0);
			mount_component(dateutil, div0, null);
			current = true;
		},
		p: noop,
		i: function intro(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			transition_in(menu.$$.fragment, local);
			transition_in(dateutil.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(header.$$.fragment, local);
			transition_out(menu.$$.fragment, local);
			transition_out(dateutil.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(main);
			destroy_component(header);
			destroy_component(menu);
			destroy_component(dateutil);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Page', slots, []);
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({ Header, Menu, DateUtil });
	return [];
}

class Page extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Page",
			options,
			id: create_fragment.name
		});
	}
}

new Page({
	target: document.body
});
//# sourceMappingURL=bundle.js.map
