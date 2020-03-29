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
    node.style.setProperty(key, value, important ? 'important' : '');
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let stylesheet;
let active = 0;
let current_rules = {};
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
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
    if (!current_rules[name]) {
        if (!stylesheet) {
            const style = element('style');
            document.head.appendChild(style);
            stylesheet = style.sheet;
        }
        current_rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    node.style.animation = (node.style.animation || '')
        .split(', ')
        .filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    )
        .join(', ');
    if (name && !--active)
        clear_rules();
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        let i = stylesheet.cssRules.length;
        while (i--)
            stylesheet.deleteRule(i);
        current_rules = {};
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        callbacks.slice().forEach(fn => fn(event));
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
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
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
    flushing = false;
    seen_callbacks.clear();
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

const globals = (typeof window !== 'undefined' ? window : global);
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
            throw new Error(`Cannot have duplicate keys in a keyed each`);
        }
        keys.add(key);
    }
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
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
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
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
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
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
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
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(children(options.target));
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
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
    $set() {
        // overridden by instance, if it has props
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.2' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
}
function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
    const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
    if (has_prevent_default)
        modifiers.push('preventDefault');
    if (has_stop_propagation)
        modifiers.push('stopPropagation');
    dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
    const dispose = listen(node, event, handler, options);
    return () => {
        dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
        dispose();
    };
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else
        dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
}
function set_data_dev(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
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
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error(`'target' is a required option`);
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

/* src/layout/Header.svelte generated by Svelte v3.19.2 */

const file = "src/layout/Header.svelte";

function create_fragment(ctx) {
	let div;

	const block = {
		c: function create() {
			div = element("div");
			div.textContent = "Toolkit";
			attr_dev(div, "id", "header");
			attr_dev(div, "class", "svelte-1mj1oaw");
			add_location(div, file, 2, 0, 19);
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
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Header", $$slots, []);
	return [];
}

class Header extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Header",
			options,
			id: create_fragment.name
		});
	}
}

/* src/layout/Menu.svelte generated by Svelte v3.19.2 */

const file$1 = "src/layout/Menu.svelte";

function create_fragment$1(ctx) {
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
			add_location(li0, file$1, 4, 8, 90);
			attr_dev(li1, "class", "svelte-e82p89");
			add_location(li1, file$1, 5, 8, 117);
			attr_dev(ul, "class", "svelte-e82p89");
			add_location(ul, file$1, 3, 4, 77);
			attr_dev(nav, "class", "left-nav svelte-e82p89");
			attr_dev(nav, "aria-labelledby", "primary-menu");
			add_location(nav, file$1, 2, 0, 19);
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
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Menu> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Menu", $$slots, []);
	return [];
}

class Menu extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Menu",
			options,
			id: create_fragment$1.name
		});
	}
}

const getCalendarPage = (month, year, dayProps, weekStart = 0) => {
  let date = new Date(year, month, 1);
  date.setDate(date.getDate() - date.getDay() + weekStart);
  let nextMonth = month === 11 ? 0 : month + 1;
  // ensure days starts on Sunday
  // and end on saturday
  let weeks = [];
  while (date.getMonth() !== nextMonth || date.getDay() !== weekStart || weeks.length !== 6) {
    if (date.getDay() === weekStart) weeks.unshift({ days: [], id: `${year}${month}${year}${weeks.length}` });
    const updated = Object.assign({
      partOfMonth: date.getMonth() === month,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      date: new Date(date)
    }, dayProps(date));
    weeks[0].days.push(updated);
    date.setDate(date.getDate() + 1);
  }
  weeks.reverse();
  return { month, year, weeks };
};

const getDayPropsHandler = (start, end, selectableCallback) => {
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  return date => {
    const isInRange = date >= start && date <= end;
    return {
      isInRange,
      selectable: isInRange && (!selectableCallback || selectableCallback(date)),
      isToday: date.getTime() === today.getTime()
    };
  };
};

function getMonths(start, end, selectableCallback = null, weekStart = 0) {
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let endDate = new Date(end.getFullYear(), end.getMonth() + 1, 1);
  let months = [];
  let date = new Date(start.getFullYear(), start.getMonth(), 1);
  let dayPropsHandler = getDayPropsHandler(start, end, selectableCallback);
  while (date < endDate) {
    months.push(getCalendarPage(date.getMonth(), date.getFullYear(), dayPropsHandler, weekStart));
    date.setMonth(date.getMonth() + 1);
  }
  return months;
}

const areDatesEquivalent = (a, b) => a.getDate() === b.getDate()
  && a.getMonth() === b.getMonth()
  && a.getFullYear() === b.getFullYear();

function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
}

function fade(node, { delay = 0, duration = 400, easing = identity }) {
    const o = +getComputedStyle(node).opacity;
    return {
        delay,
        duration,
        easing,
        css: t => `opacity: ${t * o}`
    };
}
function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const transform = style.transform === 'none' ? '' : style.transform;
    const od = target_opacity * (1 - opacity);
    return {
        delay,
        duration,
        easing,
        css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
    };
}

/* node_modules/svelte-calendar/src/Components/Week.svelte generated by Svelte v3.19.2 */
const file$2 = "node_modules/svelte-calendar/src/Components/Week.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	return child_ctx;
}

// (20:2) {#each days as day}
function create_each_block(ctx) {
	let div;
	let button;
	let t0_value = /*day*/ ctx[7].date.getDate() + "";
	let t0;
	let t1;
	let dispose;

	function click_handler(...args) {
		return /*click_handler*/ ctx[6](/*day*/ ctx[7], ...args);
	}

	const block = {
		c: function create() {
			div = element("div");
			button = element("button");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(button, "class", "day--label svelte-5wjnn4");
			attr_dev(button, "type", "button");
			toggle_class(button, "selected", areDatesEquivalent(/*day*/ ctx[7].date, /*selected*/ ctx[1]));
			toggle_class(button, "highlighted", areDatesEquivalent(/*day*/ ctx[7].date, /*highlighted*/ ctx[2]));
			toggle_class(button, "shake-date", /*shouldShakeDate*/ ctx[3] && areDatesEquivalent(/*day*/ ctx[7].date, /*shouldShakeDate*/ ctx[3]));
			toggle_class(button, "disabled", !/*day*/ ctx[7].selectable);
			add_location(button, file$2, 26, 6, 666);
			attr_dev(div, "class", "day svelte-5wjnn4");
			toggle_class(div, "outside-month", !/*day*/ ctx[7].partOfMonth);
			toggle_class(div, "is-today", /*day*/ ctx[7].isToday);
			toggle_class(div, "is-disabled", !/*day*/ ctx[7].selectable);
			add_location(div, file$2, 20, 4, 501);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			append_dev(button, t0);
			append_dev(div, t1);
			dispose = listen_dev(button, "click", click_handler, false, false, false);
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*days*/ 1 && t0_value !== (t0_value = /*day*/ ctx[7].date.getDate() + "")) set_data_dev(t0, t0_value);

			if (dirty & /*areDatesEquivalent, days, selected*/ 3) {
				toggle_class(button, "selected", areDatesEquivalent(/*day*/ ctx[7].date, /*selected*/ ctx[1]));
			}

			if (dirty & /*areDatesEquivalent, days, highlighted*/ 5) {
				toggle_class(button, "highlighted", areDatesEquivalent(/*day*/ ctx[7].date, /*highlighted*/ ctx[2]));
			}

			if (dirty & /*shouldShakeDate, areDatesEquivalent, days*/ 9) {
				toggle_class(button, "shake-date", /*shouldShakeDate*/ ctx[3] && areDatesEquivalent(/*day*/ ctx[7].date, /*shouldShakeDate*/ ctx[3]));
			}

			if (dirty & /*days*/ 1) {
				toggle_class(button, "disabled", !/*day*/ ctx[7].selectable);
			}

			if (dirty & /*days*/ 1) {
				toggle_class(div, "outside-month", !/*day*/ ctx[7].partOfMonth);
			}

			if (dirty & /*days*/ 1) {
				toggle_class(div, "is-today", /*day*/ ctx[7].isToday);
			}

			if (dirty & /*days*/ 1) {
				toggle_class(div, "is-disabled", !/*day*/ ctx[7].selectable);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(20:2) {#each days as day}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let div;
	let div_intro;
	let div_outro;
	let current;
	let each_value = /*days*/ ctx[0];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(div, "class", "week svelte-5wjnn4");
			add_location(div, file$2, 14, 0, 343);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*days, areDatesEquivalent, selected, highlighted, shouldShakeDate, dispatch*/ 47) {
				each_value = /*days*/ ctx[0];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (div_outro) div_outro.end(1);

					if (!div_intro) div_intro = create_in_transition(div, fly, {
						x: /*direction*/ ctx[4] * 50,
						duration: 180,
						delay: 90
					});

					div_intro.start();
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (div_intro) div_intro.invalidate();

			if (local) {
				div_outro = create_out_transition(div, fade, { duration: 180 });
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			destroy_each(each_blocks, detaching);
			if (detaching && div_outro) div_outro.end();
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
	const dispatch = createEventDispatcher();
	let { days } = $$props;
	let { selected } = $$props;
	let { highlighted } = $$props;
	let { shouldShakeDate } = $$props;
	let { direction } = $$props;
	const writable_props = ["days", "selected", "highlighted", "shouldShakeDate", "direction"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Week> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Week", $$slots, []);
	const click_handler = day => dispatch("dateSelected", day.date);

	$$self.$set = $$props => {
		if ("days" in $$props) $$invalidate(0, days = $$props.days);
		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
		if ("highlighted" in $$props) $$invalidate(2, highlighted = $$props.highlighted);
		if ("shouldShakeDate" in $$props) $$invalidate(3, shouldShakeDate = $$props.shouldShakeDate);
		if ("direction" in $$props) $$invalidate(4, direction = $$props.direction);
	};

	$$self.$capture_state = () => ({
		areDatesEquivalent,
		fly,
		fade,
		createEventDispatcher,
		dispatch,
		days,
		selected,
		highlighted,
		shouldShakeDate,
		direction
	});

	$$self.$inject_state = $$props => {
		if ("days" in $$props) $$invalidate(0, days = $$props.days);
		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
		if ("highlighted" in $$props) $$invalidate(2, highlighted = $$props.highlighted);
		if ("shouldShakeDate" in $$props) $$invalidate(3, shouldShakeDate = $$props.shouldShakeDate);
		if ("direction" in $$props) $$invalidate(4, direction = $$props.direction);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		days,
		selected,
		highlighted,
		shouldShakeDate,
		direction,
		dispatch,
		click_handler
	];
}

class Week extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			days: 0,
			selected: 1,
			highlighted: 2,
			shouldShakeDate: 3,
			direction: 4
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Week",
			options,
			id: create_fragment$2.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*days*/ ctx[0] === undefined && !("days" in props)) {
			console.warn("<Week> was created without expected prop 'days'");
		}

		if (/*selected*/ ctx[1] === undefined && !("selected" in props)) {
			console.warn("<Week> was created without expected prop 'selected'");
		}

		if (/*highlighted*/ ctx[2] === undefined && !("highlighted" in props)) {
			console.warn("<Week> was created without expected prop 'highlighted'");
		}

		if (/*shouldShakeDate*/ ctx[3] === undefined && !("shouldShakeDate" in props)) {
			console.warn("<Week> was created without expected prop 'shouldShakeDate'");
		}

		if (/*direction*/ ctx[4] === undefined && !("direction" in props)) {
			console.warn("<Week> was created without expected prop 'direction'");
		}
	}

	get days() {
		throw new Error("<Week>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set days(value) {
		throw new Error("<Week>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get selected() {
		throw new Error("<Week>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set selected(value) {
		throw new Error("<Week>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get highlighted() {
		throw new Error("<Week>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set highlighted(value) {
		throw new Error("<Week>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get shouldShakeDate() {
		throw new Error("<Week>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set shouldShakeDate(value) {
		throw new Error("<Week>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get direction() {
		throw new Error("<Week>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set direction(value) {
		throw new Error("<Week>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* node_modules/svelte-calendar/src/Components/Month.svelte generated by Svelte v3.19.2 */
const file$3 = "node_modules/svelte-calendar/src/Components/Month.svelte";

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	return child_ctx;
}

// (20:2) {#each visibleMonth.weeks as week (week.id) }
function create_each_block$1(key_1, ctx) {
	let first;
	let current;

	const week = new Week({
			props: {
				days: /*week*/ ctx[8].days,
				selected: /*selected*/ ctx[1],
				highlighted: /*highlighted*/ ctx[2],
				shouldShakeDate: /*shouldShakeDate*/ ctx[3],
				direction: /*direction*/ ctx[4]
			},
			$$inline: true
		});

	week.$on("dateSelected", /*dateSelected_handler*/ ctx[7]);

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			first = empty();
			create_component(week.$$.fragment);
			this.first = first;
		},
		m: function mount(target, anchor) {
			insert_dev(target, first, anchor);
			mount_component(week, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const week_changes = {};
			if (dirty & /*visibleMonth*/ 1) week_changes.days = /*week*/ ctx[8].days;
			if (dirty & /*selected*/ 2) week_changes.selected = /*selected*/ ctx[1];
			if (dirty & /*highlighted*/ 4) week_changes.highlighted = /*highlighted*/ ctx[2];
			if (dirty & /*shouldShakeDate*/ 8) week_changes.shouldShakeDate = /*shouldShakeDate*/ ctx[3];
			if (dirty & /*direction*/ 16) week_changes.direction = /*direction*/ ctx[4];
			week.$set(week_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(week.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(week.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(first);
			destroy_component(week, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$1.name,
		type: "each",
		source: "(20:2) {#each visibleMonth.weeks as week (week.id) }",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let div;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	let each_value = /*visibleMonth*/ ctx[0].weeks;
	validate_each_argument(each_value);
	const get_key = ctx => /*week*/ ctx[8].id;
	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$1(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
	}

	const block = {
		c: function create() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(div, "class", "month-container svelte-1y5dcxc");
			add_location(div, file$3, 18, 0, 286);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*visibleMonth, selected, highlighted, shouldShakeDate, direction*/ 31) {
				const each_value = /*visibleMonth*/ ctx[0].weeks;
				validate_each_argument(each_value);
				group_outros();
				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
				check_outros();
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
	let { id } = $$props;
	let { visibleMonth } = $$props;
	let { selected } = $$props;
	let { highlighted } = $$props;
	let { shouldShakeDate } = $$props;
	let lastId = id;
	let direction;
	const writable_props = ["id", "visibleMonth", "selected", "highlighted", "shouldShakeDate"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Month> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Month", $$slots, []);

	function dateSelected_handler(event) {
		bubble($$self, event);
	}

	$$self.$set = $$props => {
		if ("id" in $$props) $$invalidate(5, id = $$props.id);
		if ("visibleMonth" in $$props) $$invalidate(0, visibleMonth = $$props.visibleMonth);
		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
		if ("highlighted" in $$props) $$invalidate(2, highlighted = $$props.highlighted);
		if ("shouldShakeDate" in $$props) $$invalidate(3, shouldShakeDate = $$props.shouldShakeDate);
	};

	$$self.$capture_state = () => ({
		Week,
		id,
		visibleMonth,
		selected,
		highlighted,
		shouldShakeDate,
		lastId,
		direction
	});

	$$self.$inject_state = $$props => {
		if ("id" in $$props) $$invalidate(5, id = $$props.id);
		if ("visibleMonth" in $$props) $$invalidate(0, visibleMonth = $$props.visibleMonth);
		if ("selected" in $$props) $$invalidate(1, selected = $$props.selected);
		if ("highlighted" in $$props) $$invalidate(2, highlighted = $$props.highlighted);
		if ("shouldShakeDate" in $$props) $$invalidate(3, shouldShakeDate = $$props.shouldShakeDate);
		if ("lastId" in $$props) $$invalidate(6, lastId = $$props.lastId);
		if ("direction" in $$props) $$invalidate(4, direction = $$props.direction);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*lastId, id*/ 96) {
			 {
				$$invalidate(4, direction = lastId < id ? 1 : -1);
				$$invalidate(6, lastId = id);
			}
		}
	};

	return [
		visibleMonth,
		selected,
		highlighted,
		shouldShakeDate,
		direction,
		id,
		lastId,
		dateSelected_handler
	];
}

class Month extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
			id: 5,
			visibleMonth: 0,
			selected: 1,
			highlighted: 2,
			shouldShakeDate: 3
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Month",
			options,
			id: create_fragment$3.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*id*/ ctx[5] === undefined && !("id" in props)) {
			console.warn("<Month> was created without expected prop 'id'");
		}

		if (/*visibleMonth*/ ctx[0] === undefined && !("visibleMonth" in props)) {
			console.warn("<Month> was created without expected prop 'visibleMonth'");
		}

		if (/*selected*/ ctx[1] === undefined && !("selected" in props)) {
			console.warn("<Month> was created without expected prop 'selected'");
		}

		if (/*highlighted*/ ctx[2] === undefined && !("highlighted" in props)) {
			console.warn("<Month> was created without expected prop 'highlighted'");
		}

		if (/*shouldShakeDate*/ ctx[3] === undefined && !("shouldShakeDate" in props)) {
			console.warn("<Month> was created without expected prop 'shouldShakeDate'");
		}
	}

	get id() {
		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set id(value) {
		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get visibleMonth() {
		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set visibleMonth(value) {
		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get selected() {
		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set selected(value) {
		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get highlighted() {
		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set highlighted(value) {
		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get shouldShakeDate() {
		throw new Error("<Month>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set shouldShakeDate(value) {
		throw new Error("<Month>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* node_modules/svelte-calendar/src/Components/NavBar.svelte generated by Svelte v3.19.2 */

const { Object: Object_1 } = globals;
const file$4 = "node_modules/svelte-calendar/src/Components/NavBar.svelte";

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[15] = list[i];
	child_ctx[17] = i;
	return child_ctx;
}

// (64:4) {#each availableMonths as monthDefinition, index}
function create_each_block$2(ctx) {
	let div;
	let span;
	let t0_value = /*monthDefinition*/ ctx[15].abbrev + "";
	let t0;
	let t1;
	let dispose;

	function click_handler_2(...args) {
		return /*click_handler_2*/ ctx[14](/*monthDefinition*/ ctx[15], /*index*/ ctx[17], ...args);
	}

	const block = {
		c: function create() {
			div = element("div");
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			attr_dev(span, "class", "svelte-1uccyem");
			add_location(span, file$4, 70, 8, 1978);
			attr_dev(div, "class", "month-selector--month svelte-1uccyem");
			toggle_class(div, "selected", /*index*/ ctx[17] === /*month*/ ctx[0]);
			toggle_class(div, "selectable", /*monthDefinition*/ ctx[15].selectable);
			add_location(div, file$4, 64, 6, 1741);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, span);
			append_dev(span, t0);
			append_dev(div, t1);
			dispose = listen_dev(div, "click", click_handler_2, false, false, false);
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*availableMonths*/ 64 && t0_value !== (t0_value = /*monthDefinition*/ ctx[15].abbrev + "")) set_data_dev(t0, t0_value);

			if (dirty & /*month*/ 1) {
				toggle_class(div, "selected", /*index*/ ctx[17] === /*month*/ ctx[0]);
			}

			if (dirty & /*availableMonths*/ 64) {
				toggle_class(div, "selectable", /*monthDefinition*/ ctx[15].selectable);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$2.name,
		type: "each",
		source: "(64:4) {#each availableMonths as monthDefinition, index}",
		ctx
	});

	return block;
}

function create_fragment$4(ctx) {
	let div5;
	let div3;
	let div0;
	let i0;
	let t0;
	let div1;
	let t1_value = /*monthsOfYear*/ ctx[4][/*month*/ ctx[0]][0] + "";
	let t1;
	let t2;
	let t3;
	let t4;
	let div2;
	let i1;
	let t5;
	let div4;
	let dispose;
	let each_value = /*availableMonths*/ ctx[6];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div5 = element("div");
			div3 = element("div");
			div0 = element("div");
			i0 = element("i");
			t0 = space();
			div1 = element("div");
			t1 = text(t1_value);
			t2 = space();
			t3 = text(/*year*/ ctx[1]);
			t4 = space();
			div2 = element("div");
			i1 = element("i");
			t5 = space();
			div4 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(i0, "class", "arrow left svelte-1uccyem");
			add_location(i0, file$4, 51, 6, 1286);
			attr_dev(div0, "class", "control svelte-1uccyem");
			toggle_class(div0, "enabled", /*canDecrementMonth*/ ctx[3]);
			add_location(div0, file$4, 48, 4, 1160);
			attr_dev(div1, "class", "label svelte-1uccyem");
			add_location(div1, file$4, 53, 4, 1330);
			attr_dev(i1, "class", "arrow right svelte-1uccyem");
			add_location(i1, file$4, 59, 6, 1566);
			attr_dev(div2, "class", "control svelte-1uccyem");
			toggle_class(div2, "enabled", /*canIncrementMonth*/ ctx[2]);
			add_location(div2, file$4, 56, 4, 1442);
			attr_dev(div3, "class", "heading-section svelte-1uccyem");
			add_location(div3, file$4, 47, 2, 1125);
			attr_dev(div4, "class", "month-selector svelte-1uccyem");
			toggle_class(div4, "open", /*monthSelectorOpen*/ ctx[5]);
			add_location(div4, file$4, 62, 2, 1619);
			attr_dev(div5, "class", "title");
			add_location(div5, file$4, 46, 0, 1102);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div5, anchor);
			append_dev(div5, div3);
			append_dev(div3, div0);
			append_dev(div0, i0);
			append_dev(div3, t0);
			append_dev(div3, div1);
			append_dev(div1, t1);
			append_dev(div1, t2);
			append_dev(div1, t3);
			append_dev(div3, t4);
			append_dev(div3, div2);
			append_dev(div2, i1);
			append_dev(div5, t5);
			append_dev(div5, div4);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div4, null);
			}

			dispose = [
				listen_dev(div0, "click", /*click_handler*/ ctx[12], false, false, false),
				listen_dev(div1, "click", /*toggleMonthSelectorOpen*/ ctx[8], false, false, false),
				listen_dev(div2, "click", /*click_handler_1*/ ctx[13], false, false, false)
			];
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*canDecrementMonth*/ 8) {
				toggle_class(div0, "enabled", /*canDecrementMonth*/ ctx[3]);
			}

			if (dirty & /*monthsOfYear, month*/ 17 && t1_value !== (t1_value = /*monthsOfYear*/ ctx[4][/*month*/ ctx[0]][0] + "")) set_data_dev(t1, t1_value);
			if (dirty & /*year*/ 2) set_data_dev(t3, /*year*/ ctx[1]);

			if (dirty & /*canIncrementMonth*/ 4) {
				toggle_class(div2, "enabled", /*canIncrementMonth*/ ctx[2]);
			}

			if (dirty & /*month, availableMonths, monthSelected*/ 577) {
				each_value = /*availableMonths*/ ctx[6];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div4, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*monthSelectorOpen*/ 32) {
				toggle_class(div4, "open", /*monthSelectorOpen*/ ctx[5]);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(div5);
			destroy_each(each_blocks, detaching);
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
	const dispatch = createEventDispatcher();
	let { month } = $$props;
	let { year } = $$props;
	let { start } = $$props;
	let { end } = $$props;
	let { canIncrementMonth } = $$props;
	let { canDecrementMonth } = $$props;
	let { monthsOfYear } = $$props;
	let monthSelectorOpen = false;
	let availableMonths;

	function toggleMonthSelectorOpen() {
		$$invalidate(5, monthSelectorOpen = !monthSelectorOpen);
	}

	function monthSelected(event, { m, i }) {
		event.stopPropagation();
		if (!m.selectable) return;
		dispatch("monthSelected", i);
		toggleMonthSelectorOpen();
	}

	const writable_props = [
		"month",
		"year",
		"start",
		"end",
		"canIncrementMonth",
		"canDecrementMonth",
		"monthsOfYear"
	];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NavBar> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("NavBar", $$slots, []);
	const click_handler = () => dispatch("incrementMonth", -1);
	const click_handler_1 = () => dispatch("incrementMonth", 1);
	const click_handler_2 = (monthDefinition, index, e) => monthSelected(e, { m: monthDefinition, i: index });

	$$self.$set = $$props => {
		if ("month" in $$props) $$invalidate(0, month = $$props.month);
		if ("year" in $$props) $$invalidate(1, year = $$props.year);
		if ("start" in $$props) $$invalidate(10, start = $$props.start);
		if ("end" in $$props) $$invalidate(11, end = $$props.end);
		if ("canIncrementMonth" in $$props) $$invalidate(2, canIncrementMonth = $$props.canIncrementMonth);
		if ("canDecrementMonth" in $$props) $$invalidate(3, canDecrementMonth = $$props.canDecrementMonth);
		if ("monthsOfYear" in $$props) $$invalidate(4, monthsOfYear = $$props.monthsOfYear);
	};

	$$self.$capture_state = () => ({
		createEventDispatcher,
		dispatch,
		month,
		year,
		start,
		end,
		canIncrementMonth,
		canDecrementMonth,
		monthsOfYear,
		monthSelectorOpen,
		availableMonths,
		toggleMonthSelectorOpen,
		monthSelected
	});

	$$self.$inject_state = $$props => {
		if ("month" in $$props) $$invalidate(0, month = $$props.month);
		if ("year" in $$props) $$invalidate(1, year = $$props.year);
		if ("start" in $$props) $$invalidate(10, start = $$props.start);
		if ("end" in $$props) $$invalidate(11, end = $$props.end);
		if ("canIncrementMonth" in $$props) $$invalidate(2, canIncrementMonth = $$props.canIncrementMonth);
		if ("canDecrementMonth" in $$props) $$invalidate(3, canDecrementMonth = $$props.canDecrementMonth);
		if ("monthsOfYear" in $$props) $$invalidate(4, monthsOfYear = $$props.monthsOfYear);
		if ("monthSelectorOpen" in $$props) $$invalidate(5, monthSelectorOpen = $$props.monthSelectorOpen);
		if ("availableMonths" in $$props) $$invalidate(6, availableMonths = $$props.availableMonths);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*start, year, end, monthsOfYear*/ 3090) {
			 {
				let isOnLowerBoundary = start.getFullYear() === year;
				let isOnUpperBoundary = end.getFullYear() === year;

				$$invalidate(6, availableMonths = monthsOfYear.map((m, i) => {
					return Object.assign({}, { name: m[0], abbrev: m[1] }, {
						selectable: !isOnLowerBoundary && !isOnUpperBoundary || (!isOnLowerBoundary || i >= start.getMonth()) && (!isOnUpperBoundary || i <= end.getMonth())
					});
				}));
			}
		}
	};

	return [
		month,
		year,
		canIncrementMonth,
		canDecrementMonth,
		monthsOfYear,
		monthSelectorOpen,
		availableMonths,
		dispatch,
		toggleMonthSelectorOpen,
		monthSelected,
		start,
		end,
		click_handler,
		click_handler_1,
		click_handler_2
	];
}

class NavBar extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
			month: 0,
			year: 1,
			start: 10,
			end: 11,
			canIncrementMonth: 2,
			canDecrementMonth: 3,
			monthsOfYear: 4
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "NavBar",
			options,
			id: create_fragment$4.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*month*/ ctx[0] === undefined && !("month" in props)) {
			console.warn("<NavBar> was created without expected prop 'month'");
		}

		if (/*year*/ ctx[1] === undefined && !("year" in props)) {
			console.warn("<NavBar> was created without expected prop 'year'");
		}

		if (/*start*/ ctx[10] === undefined && !("start" in props)) {
			console.warn("<NavBar> was created without expected prop 'start'");
		}

		if (/*end*/ ctx[11] === undefined && !("end" in props)) {
			console.warn("<NavBar> was created without expected prop 'end'");
		}

		if (/*canIncrementMonth*/ ctx[2] === undefined && !("canIncrementMonth" in props)) {
			console.warn("<NavBar> was created without expected prop 'canIncrementMonth'");
		}

		if (/*canDecrementMonth*/ ctx[3] === undefined && !("canDecrementMonth" in props)) {
			console.warn("<NavBar> was created without expected prop 'canDecrementMonth'");
		}

		if (/*monthsOfYear*/ ctx[4] === undefined && !("monthsOfYear" in props)) {
			console.warn("<NavBar> was created without expected prop 'monthsOfYear'");
		}
	}

	get month() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set month(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get year() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set year(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get start() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set start(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get end() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set end(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get canIncrementMonth() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set canIncrementMonth(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get canDecrementMonth() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set canDecrementMonth(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get monthsOfYear() {
		throw new Error("<NavBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set monthsOfYear(value) {
		throw new Error("<NavBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* node_modules/svelte-calendar/src/Components/Popover.svelte generated by Svelte v3.19.2 */

const { window: window_1 } = globals;
const file$5 = "node_modules/svelte-calendar/src/Components/Popover.svelte";
const get_contents_slot_changes = dirty => ({});
const get_contents_slot_context = ctx => ({});
const get_trigger_slot_changes = dirty => ({});
const get_trigger_slot_context = ctx => ({});

function create_fragment$5(ctx) {
	let div4;
	let div0;
	let t;
	let div3;
	let div2;
	let div1;
	let current;
	let dispose;
	add_render_callback(/*onwindowresize*/ ctx[19]);
	const trigger_slot_template = /*$$slots*/ ctx[18].trigger;
	const trigger_slot = create_slot(trigger_slot_template, ctx, /*$$scope*/ ctx[17], get_trigger_slot_context);
	const contents_slot_template = /*$$slots*/ ctx[18].contents;
	const contents_slot = create_slot(contents_slot_template, ctx, /*$$scope*/ ctx[17], get_contents_slot_context);

	const block = {
		c: function create() {
			div4 = element("div");
			div0 = element("div");
			if (trigger_slot) trigger_slot.c();
			t = space();
			div3 = element("div");
			div2 = element("div");
			div1 = element("div");
			if (contents_slot) contents_slot.c();
			attr_dev(div0, "class", "trigger");
			add_location(div0, file$5, 103, 2, 2365);
			attr_dev(div1, "class", "contents-inner svelte-1wmex1c");
			add_location(div1, file$5, 114, 6, 2763);
			attr_dev(div2, "class", "contents svelte-1wmex1c");
			add_location(div2, file$5, 113, 4, 2704);
			attr_dev(div3, "class", "contents-wrapper svelte-1wmex1c");
			set_style(div3, "transform", "translate(-50%,-50%) translate(" + /*translateX*/ ctx[8] + "px, " + /*translateY*/ ctx[7] + "px)");
			toggle_class(div3, "visible", /*open*/ ctx[0]);
			toggle_class(div3, "shrink", /*shrink*/ ctx[1]);
			add_location(div3, file$5, 107, 2, 2487);
			attr_dev(div4, "class", "sc-popover svelte-1wmex1c");
			add_location(div4, file$5, 102, 0, 2317);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div4, anchor);
			append_dev(div4, div0);

			if (trigger_slot) {
				trigger_slot.m(div0, null);
			}

			/*div0_binding*/ ctx[20](div0);
			append_dev(div4, t);
			append_dev(div4, div3);
			append_dev(div3, div2);
			append_dev(div2, div1);

			if (contents_slot) {
				contents_slot.m(div1, null);
			}

			/*div2_binding*/ ctx[21](div2);
			/*div3_binding*/ ctx[22](div3);
			/*div4_binding*/ ctx[23](div4);
			current = true;

			dispose = [
				listen_dev(window_1, "resize", /*onwindowresize*/ ctx[19]),
				listen_dev(div0, "click", /*doOpen*/ ctx[9], false, false, false)
			];
		},
		p: function update(ctx, [dirty]) {
			if (trigger_slot && trigger_slot.p && dirty & /*$$scope*/ 131072) {
				trigger_slot.p(get_slot_context(trigger_slot_template, ctx, /*$$scope*/ ctx[17], get_trigger_slot_context), get_slot_changes(trigger_slot_template, /*$$scope*/ ctx[17], dirty, get_trigger_slot_changes));
			}

			if (contents_slot && contents_slot.p && dirty & /*$$scope*/ 131072) {
				contents_slot.p(get_slot_context(contents_slot_template, ctx, /*$$scope*/ ctx[17], get_contents_slot_context), get_slot_changes(contents_slot_template, /*$$scope*/ ctx[17], dirty, get_contents_slot_changes));
			}

			if (!current || dirty & /*translateX, translateY*/ 384) {
				set_style(div3, "transform", "translate(-50%,-50%) translate(" + /*translateX*/ ctx[8] + "px, " + /*translateY*/ ctx[7] + "px)");
			}

			if (dirty & /*open*/ 1) {
				toggle_class(div3, "visible", /*open*/ ctx[0]);
			}

			if (dirty & /*shrink*/ 2) {
				toggle_class(div3, "shrink", /*shrink*/ ctx[1]);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(trigger_slot, local);
			transition_in(contents_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(trigger_slot, local);
			transition_out(contents_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div4);
			if (trigger_slot) trigger_slot.d(detaching);
			/*div0_binding*/ ctx[20](null);
			if (contents_slot) contents_slot.d(detaching);
			/*div2_binding*/ ctx[21](null);
			/*div3_binding*/ ctx[22](null);
			/*div4_binding*/ ctx[23](null);
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
	const dispatch = createEventDispatcher();

	let once = (el, evt, cb) => {
		function handler() {
			cb.apply(this, arguments);
			el.removeEventListener(evt, handler);
		}

		el.addEventListener(evt, handler);
	};

	let popover;
	let w;
	let triggerContainer;
	let contentsAnimated;
	let contentsWrapper;
	let translateY = 0;
	let translateX = 0;
	let { open = false } = $$props;
	let { shrink } = $$props;
	let { trigger } = $$props;

	const close = () => {
		$$invalidate(1, shrink = true);

		once(contentsAnimated, "animationend", () => {
			$$invalidate(1, shrink = false);
			$$invalidate(0, open = false);
			dispatch("closed");
		});
	};

	function checkForFocusLoss(evt) {
		if (!open) return;
		let el = evt.target;

		// eslint-disable-next-line
		do {
			if (el === popover) return;
		} while (el = el.parentNode); // eslint-disable-next-line

		close();
	}

	onMount(() => {
		document.addEventListener("click", checkForFocusLoss);
		if (!trigger) return;
		triggerContainer.appendChild(trigger.parentNode.removeChild(trigger));

		// eslint-disable-next-line
		return () => {
			document.removeEventListener("click", checkForFocusLoss);
		};
	});

	const getDistanceToEdges = async () => {
		if (!open) {
			$$invalidate(0, open = true);
		}

		await tick();
		let rect = contentsWrapper.getBoundingClientRect();

		return {
			top: rect.top + -1 * translateY,
			bottom: window.innerHeight - rect.bottom + translateY,
			left: rect.left + -1 * translateX,
			right: document.body.clientWidth - rect.right + translateX
		};
	};

	const getTranslate = async () => {
		let dist = await getDistanceToEdges();
		let x;
		let y;

		if (w < 480) {
			y = dist.bottom;
		} else if (dist.top < 0) {
			y = Math.abs(dist.top);
		} else if (dist.bottom < 0) {
			y = dist.bottom;
		} else {
			y = 0;
		}

		if (dist.left < 0) {
			x = Math.abs(dist.left);
		} else if (dist.right < 0) {
			x = dist.right;
		} else {
			x = 0;
		}

		return { x, y };
	};

	const doOpen = async () => {
		const { x, y } = await getTranslate();
		$$invalidate(8, translateX = x);
		$$invalidate(7, translateY = y);
		$$invalidate(0, open = true);
		dispatch("opened");
	};

	const writable_props = ["open", "shrink", "trigger"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Popover> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Popover", $$slots, ['trigger','contents']);

	function onwindowresize() {
		$$invalidate(3, w = window_1.innerWidth);
	}

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(4, triggerContainer = $$value);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(5, contentsAnimated = $$value);
		});
	}

	function div3_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(6, contentsWrapper = $$value);
		});
	}

	function div4_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(2, popover = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("open" in $$props) $$invalidate(0, open = $$props.open);
		if ("shrink" in $$props) $$invalidate(1, shrink = $$props.shrink);
		if ("trigger" in $$props) $$invalidate(10, trigger = $$props.trigger);
		if ("$$scope" in $$props) $$invalidate(17, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		onMount,
		createEventDispatcher,
		tick,
		dispatch,
		once,
		popover,
		w,
		triggerContainer,
		contentsAnimated,
		contentsWrapper,
		translateY,
		translateX,
		open,
		shrink,
		trigger,
		close,
		checkForFocusLoss,
		getDistanceToEdges,
		getTranslate,
		doOpen
	});

	$$self.$inject_state = $$props => {
		if ("once" in $$props) once = $$props.once;
		if ("popover" in $$props) $$invalidate(2, popover = $$props.popover);
		if ("w" in $$props) $$invalidate(3, w = $$props.w);
		if ("triggerContainer" in $$props) $$invalidate(4, triggerContainer = $$props.triggerContainer);
		if ("contentsAnimated" in $$props) $$invalidate(5, contentsAnimated = $$props.contentsAnimated);
		if ("contentsWrapper" in $$props) $$invalidate(6, contentsWrapper = $$props.contentsWrapper);
		if ("translateY" in $$props) $$invalidate(7, translateY = $$props.translateY);
		if ("translateX" in $$props) $$invalidate(8, translateX = $$props.translateX);
		if ("open" in $$props) $$invalidate(0, open = $$props.open);
		if ("shrink" in $$props) $$invalidate(1, shrink = $$props.shrink);
		if ("trigger" in $$props) $$invalidate(10, trigger = $$props.trigger);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		open,
		shrink,
		popover,
		w,
		triggerContainer,
		contentsAnimated,
		contentsWrapper,
		translateY,
		translateX,
		doOpen,
		trigger,
		close,
		dispatch,
		once,
		checkForFocusLoss,
		getDistanceToEdges,
		getTranslate,
		$$scope,
		$$slots,
		onwindowresize,
		div0_binding,
		div2_binding,
		div3_binding,
		div4_binding
	];
}

class Popover extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
			open: 0,
			shrink: 1,
			trigger: 10,
			close: 11
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Popover",
			options,
			id: create_fragment$5.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*shrink*/ ctx[1] === undefined && !("shrink" in props)) {
			console.warn("<Popover> was created without expected prop 'shrink'");
		}

		if (/*trigger*/ ctx[10] === undefined && !("trigger" in props)) {
			console.warn("<Popover> was created without expected prop 'trigger'");
		}
	}

	get open() {
		throw new Error("<Popover>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set open(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get shrink() {
		throw new Error("<Popover>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set shrink(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get trigger() {
		throw new Error("<Popover>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set trigger(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get close() {
		return this.$$.ctx[11];
	}

	set close(value) {
		throw new Error("<Popover>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/**
 * generic function to inject data into token-laden string
 * @param str {String} Required
 * @param name {String} Required
 * @param value {String|Integer} Required
 * @returns {String}
 *
 * @example
 * injectStringData("The following is a token: #{tokenName}", "tokenName", 123); 
 * @returns {String} "The following is a token: 123"
 *
 */
const injectStringData = (str,name,value) => str
  .replace(new RegExp('#{'+name+'}','g'), value);

/**
 * Generic function to enforce length of string. 
 * 
 * Pass a string or number to this function and specify the desired length.
 * This function will either pad the # with leading 0's (if str.length < length)
 * or remove data from the end (@fromBack==false) or beginning (@fromBack==true)
 * of the string when str.length > length.
 *
 * When length == str.length or typeof length == 'undefined', this function
 * returns the original @str parameter.
 * 
 * @param str {String} Required
 * @param length {Integer} Required
 * @param fromBack {Boolean} Optional
 * @returns {String}
 *
 */
const enforceLength = function(str,length,fromBack) {
  str = str.toString();
  if(typeof length == 'undefined') return str;
  if(str.length == length) return str;
  fromBack = (typeof fromBack == 'undefined') ? false : fromBack;
  if(str.length < length) {
    // pad the beginning of the string w/ enough 0's to reach desired length:
    while(length - str.length > 0) str = '0' + str;
  } else if(str.length > length) {
    if(fromBack) {
      // grab the desired #/chars from end of string: ex: '2015' -> '15'
      str = str.substring(str.length-length);
    } else {
      // grab the desired #/chars from beginning of string: ex: '2015' -> '20'
      str = str.substring(0,length);
    }
  }
  return str;
};

const daysOfWeek = [ 
  [ 'Sunday', 'Sun' ],
  [ 'Monday', 'Mon' ],
  [ 'Tuesday', 'Tue' ],
  [ 'Wednesday', 'Wed' ],
  [ 'Thursday', 'Thu' ],
  [ 'Friday', 'Fri' ],
  [ 'Saturday', 'Sat' ]
];

const monthsOfYear = [ 
  [ 'January', 'Jan' ],
  [ 'February', 'Feb' ],
  [ 'March', 'Mar' ],
  [ 'April', 'Apr' ],
  [ 'May', 'May' ],
  [ 'June', 'Jun' ],
  [ 'July', 'Jul' ],
  [ 'August', 'Aug' ],
  [ 'September', 'Sep' ],
  [ 'October', 'Oct' ],
  [ 'November', 'Nov' ],
  [ 'December', 'Dec' ]
];

let dictionary = { 
  daysOfWeek, 
  monthsOfYear
};

const extendDictionary = (conf) => 
  Object.keys(conf).forEach(key => {
    if(dictionary[key] && dictionary[key].length == conf[key].length) {
      dictionary[key] = conf[key];
    }
  });

var acceptedDateTokens = [
  { 
    // d: day of the month, 2 digits with leading zeros:
    key: 'd', 
    method: function(date) { return enforceLength(date.getDate(), 2); } 
  }, { 
    // D: textual representation of day, 3 letters: Sun thru Sat
    key: 'D', 
    method: function(date) { return dictionary.daysOfWeek[date.getDay()][1]; } 
  }, { 
    // j: day of month without leading 0's
    key: 'j', 
    method: function(date) { return date.getDate(); } 
  }, { 
    // l: full textual representation of day of week: Sunday thru Saturday
    key: 'l', 
    method: function(date) { return dictionary.daysOfWeek[date.getDay()][0]; } 
  }, { 
    // F: full text month: 'January' thru 'December'
    key: 'F', 
    method: function(date) { return dictionary.monthsOfYear[date.getMonth()][0]; } 
  }, { 
    // m: 2 digit numeric month: '01' - '12':
    key: 'm', 
    method: function(date) { return enforceLength(date.getMonth()+1,2); } 
  }, { 
    // M: a short textual representation of the month, 3 letters: 'Jan' - 'Dec'
    key: 'M', 
    method: function(date) { return dictionary.monthsOfYear[date.getMonth()][1]; } 
  }, { 
    // n: numeric represetation of month w/o leading 0's, '1' - '12':
    key: 'n', 
    method: function(date) { return date.getMonth() + 1; } 
  }, { 
    // Y: Full numeric year, 4 digits
    key: 'Y', 
    method: function(date) { return date.getFullYear(); } 
  }, { 
    // y: 2 digit numeric year:
    key: 'y', 
    method: function(date) { return enforceLength(date.getFullYear(),2,true); }
   }
];

var acceptedTimeTokens = [
  { 
    // a: lowercase ante meridiem and post meridiem 'am' or 'pm'
    key: 'a', 
    method: function(date) { return (date.getHours() > 11) ? 'pm' : 'am'; } 
  }, { 
    // A: uppercase ante merdiiem and post meridiem 'AM' or 'PM'
    key: 'A', 
    method: function(date) { return (date.getHours() > 11) ? 'PM' : 'AM'; } 
  }, { 
    // g: 12-hour format of an hour without leading zeros 1-12
    key: 'g', 
    method: function(date) { return date.getHours() % 12 || 12; } 
  }, { 
    // G: 24-hour format of an hour without leading zeros 0-23
    key: 'G', 
    method: function(date) { return date.getHours(); } 
  }, { 
    // h: 12-hour format of an hour with leading zeros 01-12
    key: 'h', 
    method: function(date) { return enforceLength(date.getHours()%12 || 12,2); } 
  }, { 
    // H: 24-hour format of an hour with leading zeros: 00-23
    key: 'H', 
    method: function(date) { return enforceLength(date.getHours(),2); } 
  }, { 
    // i: Minutes with leading zeros 00-59
    key: 'i', 
    method: function(date) { return enforceLength(date.getMinutes(),2); } 
  }, { 
    // s: Seconds with leading zeros 00-59
    key: 's', 
    method: function(date) { return enforceLength(date.getSeconds(),2); }
   }
];

/**
 * Internationalization object for timeUtils.internationalize().
 * @typedef internationalizeObj
 * @property {Array} [daysOfWeek=[ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ]] daysOfWeek Weekday labels as strings, starting with Sunday.
 * @property {Array} [monthsOfYear=[ 'January','February','March','April','May','June','July','August','September','October','November','December' ]] monthsOfYear Month labels as strings, starting with January.
 */

/**
 * This function can be used to support additional languages by passing an object with 
 * `daysOfWeek` and `monthsOfYear` attributes.  Each attribute should be an array of
 * strings (ex: `daysOfWeek: ['monday', 'tuesday', 'wednesday'...]`)
 *
 * @param {internationalizeObj} conf
 */
const internationalize = (conf={}) => { 
  extendDictionary(conf);
};

/**
 * generic formatDate function which accepts dynamic templates
 * @param date {Date} Required
 * @param template {String} Optional
 * @returns {String}
 *
 * @example
 * formatDate(new Date(), '#{M}. #{j}, #{Y}')
 * @returns {Number} Returns a formatted date
 *
 */
const formatDate = (date,template='#{m}/#{d}/#{Y}') => {
  acceptedDateTokens.forEach(token => {
    if(template.indexOf(`#{${token.key}}`) == -1) return; 
    template = injectStringData(template,token.key,token.method(date));
  }); 
  acceptedTimeTokens.forEach(token => {
    if(template.indexOf(`#{${token.key}}`) == -1) return;
    template = injectStringData(template,token.key,token.method(date));
  });
  return template;
};

const keyCodes = {
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  pgup: 33,
  pgdown: 34,
  enter: 13,
  escape: 27,
  tab: 9
};

const keyCodesArray = Object.keys(keyCodes).map(k => keyCodes[k]);

/* node_modules/svelte-calendar/src/Components/Datepicker.svelte generated by Svelte v3.19.2 */
const file$6 = "node_modules/svelte-calendar/src/Components/Datepicker.svelte";

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[62] = list[i];
	return child_ctx;
}

const get_default_slot_changes = dirty => ({
	selected: dirty[0] & /*selected*/ 1,
	formattedSelected: dirty[0] & /*formattedSelected*/ 4
});

const get_default_slot_context = ctx => ({
	selected: /*selected*/ ctx[0],
	formattedSelected: /*formattedSelected*/ ctx[2]
});

// (272:8) {#if !trigger}
function create_if_block(ctx) {
	let button;
	let t;

	const block = {
		c: function create() {
			button = element("button");
			t = text(/*formattedSelected*/ ctx[2]);
			attr_dev(button, "class", "calendar-button svelte-1lorc63");
			attr_dev(button, "type", "button");
			add_location(button, file$6, 272, 8, 7574);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);
			append_dev(button, t);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*formattedSelected*/ 4) set_data_dev(t, /*formattedSelected*/ ctx[2]);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(button);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(272:8) {#if !trigger}",
		ctx
	});

	return block;
}

// (270:4) <div slot="trigger">
function create_trigger_slot(ctx) {
	let div;
	let current;
	const default_slot_template = /*$$slots*/ ctx[54].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[61], get_default_slot_context);
	let if_block = !/*trigger*/ ctx[1] && create_if_block(ctx);

	const block = {
		c: function create() {
			div = element("div");

			if (!default_slot) {
				if (if_block) if_block.c();
			}

			if (default_slot) default_slot.c();
			attr_dev(div, "slot", "trigger");
			attr_dev(div, "class", "svelte-1lorc63");
			add_location(div, file$6, 269, 4, 7478);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (!default_slot) {
				if (if_block) if_block.m(div, null);
			}

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p: function update(ctx, dirty) {
			if (!default_slot) {
				if (!/*trigger*/ ctx[1]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			}

			if (default_slot && default_slot.p && dirty[0] & /*selected, formattedSelected*/ 5 | dirty[1] & /*$$scope*/ 1073741824) {
				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[61], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[61], dirty, get_default_slot_changes));
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

			if (!default_slot) {
				if (if_block) if_block.d();
			}

			if (default_slot) default_slot.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_trigger_slot.name,
		type: "slot",
		source: "(270:4) <div slot=\\\"trigger\\\">",
		ctx
	});

	return block;
}

// (293:10) {#each sortedDaysOfWeek as day}
function create_each_block$3(ctx) {
	let span;
	let t_value = /*day*/ ctx[62][1] + "";
	let t;

	const block = {
		c: function create() {
			span = element("span");
			t = text(t_value);
			attr_dev(span, "class", "svelte-1lorc63");
			add_location(span, file$6, 293, 10, 8143);
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
		id: create_each_block$3.name,
		type: "each",
		source: "(293:10) {#each sortedDaysOfWeek as day}",
		ctx
	});

	return block;
}

// (279:4) <div slot="contents">
function create_contents_slot(ctx) {
	let div0;
	let div2;
	let t0;
	let div1;
	let t1;
	let current;

	const navbar = new NavBar({
			props: {
				month: /*month*/ ctx[9],
				year: /*year*/ ctx[10],
				canIncrementMonth: /*canIncrementMonth*/ ctx[15],
				canDecrementMonth: /*canDecrementMonth*/ ctx[16],
				start: /*start*/ ctx[3],
				end: /*end*/ ctx[4],
				monthsOfYear: /*monthsOfYear*/ ctx[5]
			},
			$$inline: true
		});

	navbar.$on("monthSelected", /*monthSelected_handler*/ ctx[55]);
	navbar.$on("incrementMonth", /*incrementMonth_handler*/ ctx[56]);
	let each_value = /*sortedDaysOfWeek*/ ctx[18];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	const month_1 = new Month({
			props: {
				visibleMonth: /*visibleMonth*/ ctx[13],
				selected: /*selected*/ ctx[0],
				highlighted: /*highlighted*/ ctx[7],
				shouldShakeDate: /*shouldShakeDate*/ ctx[8],
				id: /*visibleMonthId*/ ctx[14]
			},
			$$inline: true
		});

	month_1.$on("dateSelected", /*dateSelected_handler*/ ctx[57]);

	const block = {
		c: function create() {
			div0 = element("div");
			div2 = element("div");
			create_component(navbar.$$.fragment);
			t0 = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t1 = space();
			create_component(month_1.$$.fragment);
			attr_dev(div1, "class", "legend svelte-1lorc63");
			add_location(div1, file$6, 291, 8, 8070);
			attr_dev(div2, "class", "calendar svelte-1lorc63");
			add_location(div2, file$6, 279, 6, 7740);
			attr_dev(div0, "slot", "contents");
			attr_dev(div0, "class", "svelte-1lorc63");
			add_location(div0, file$6, 278, 4, 7712);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div0, anchor);
			append_dev(div0, div2);
			mount_component(navbar, div2, null);
			append_dev(div2, t0);
			append_dev(div2, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}

			append_dev(div2, t1);
			mount_component(month_1, div2, null);
			current = true;
		},
		p: function update(ctx, dirty) {
			const navbar_changes = {};
			if (dirty[0] & /*month*/ 512) navbar_changes.month = /*month*/ ctx[9];
			if (dirty[0] & /*year*/ 1024) navbar_changes.year = /*year*/ ctx[10];
			if (dirty[0] & /*canIncrementMonth*/ 32768) navbar_changes.canIncrementMonth = /*canIncrementMonth*/ ctx[15];
			if (dirty[0] & /*canDecrementMonth*/ 65536) navbar_changes.canDecrementMonth = /*canDecrementMonth*/ ctx[16];
			if (dirty[0] & /*start*/ 8) navbar_changes.start = /*start*/ ctx[3];
			if (dirty[0] & /*end*/ 16) navbar_changes.end = /*end*/ ctx[4];
			if (dirty[0] & /*monthsOfYear*/ 32) navbar_changes.monthsOfYear = /*monthsOfYear*/ ctx[5];
			navbar.$set(navbar_changes);

			if (dirty[0] & /*sortedDaysOfWeek*/ 262144) {
				each_value = /*sortedDaysOfWeek*/ ctx[18];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			const month_1_changes = {};
			if (dirty[0] & /*visibleMonth*/ 8192) month_1_changes.visibleMonth = /*visibleMonth*/ ctx[13];
			if (dirty[0] & /*selected*/ 1) month_1_changes.selected = /*selected*/ ctx[0];
			if (dirty[0] & /*highlighted*/ 128) month_1_changes.highlighted = /*highlighted*/ ctx[7];
			if (dirty[0] & /*shouldShakeDate*/ 256) month_1_changes.shouldShakeDate = /*shouldShakeDate*/ ctx[8];
			if (dirty[0] & /*visibleMonthId*/ 16384) month_1_changes.id = /*visibleMonthId*/ ctx[14];
			month_1.$set(month_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(navbar.$$.fragment, local);
			transition_in(month_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(navbar.$$.fragment, local);
			transition_out(month_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div0);
			destroy_component(navbar);
			destroy_each(each_blocks, detaching);
			destroy_component(month_1);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_contents_slot.name,
		type: "slot",
		source: "(279:4) <div slot=\\\"contents\\\">",
		ctx
	});

	return block;
}

// (262:2) <Popover     bind:this="{popover}"     bind:open="{isOpen}"     bind:shrink="{isClosing}"     {trigger}     on:opened="{registerOpen}"     on:closed="{registerClose}"   >
function create_default_slot(ctx) {
	let t;

	const block = {
		c: function create() {
			t = space();
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(t);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot.name,
		type: "slot",
		source: "(262:2) <Popover     bind:this=\\\"{popover}\\\"     bind:open=\\\"{isOpen}\\\"     bind:shrink=\\\"{isClosing}\\\"     {trigger}     on:opened=\\\"{registerOpen}\\\"     on:closed=\\\"{registerClose}\\\"   >",
		ctx
	});

	return block;
}

function create_fragment$6(ctx) {
	let div;
	let updating_open;
	let updating_shrink;
	let current;

	function popover_1_open_binding(value) {
		/*popover_1_open_binding*/ ctx[59].call(null, value);
	}

	function popover_1_shrink_binding(value) {
		/*popover_1_shrink_binding*/ ctx[60].call(null, value);
	}

	let popover_1_props = {
		trigger: /*trigger*/ ctx[1],
		$$slots: {
			default: [create_default_slot],
			contents: [create_contents_slot],
			trigger: [create_trigger_slot]
		},
		$$scope: { ctx }
	};

	if (/*isOpen*/ ctx[11] !== void 0) {
		popover_1_props.open = /*isOpen*/ ctx[11];
	}

	if (/*isClosing*/ ctx[12] !== void 0) {
		popover_1_props.shrink = /*isClosing*/ ctx[12];
	}

	const popover_1 = new Popover({ props: popover_1_props, $$inline: true });
	/*popover_1_binding*/ ctx[58](popover_1);
	binding_callbacks.push(() => bind(popover_1, "open", popover_1_open_binding));
	binding_callbacks.push(() => bind(popover_1, "shrink", popover_1_shrink_binding));
	popover_1.$on("opened", /*registerOpen*/ ctx[23]);
	popover_1.$on("closed", /*registerClose*/ ctx[22]);

	const block = {
		c: function create() {
			div = element("div");
			create_component(popover_1.$$.fragment);
			attr_dev(div, "class", "datepicker svelte-1lorc63");
			attr_dev(div, "style", /*wrapperStyle*/ ctx[17]);
			toggle_class(div, "open", /*isOpen*/ ctx[11]);
			toggle_class(div, "closing", /*isClosing*/ ctx[12]);
			add_location(div, file$6, 255, 0, 7193);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			mount_component(popover_1, div, null);
			current = true;
		},
		p: function update(ctx, dirty) {
			const popover_1_changes = {};
			if (dirty[0] & /*trigger*/ 2) popover_1_changes.trigger = /*trigger*/ ctx[1];

			if (dirty[0] & /*visibleMonth, selected, highlighted, shouldShakeDate, visibleMonthId, month, year, canIncrementMonth, canDecrementMonth, start, end, monthsOfYear, formattedSelected, trigger*/ 124863 | dirty[1] & /*$$scope*/ 1073741824) {
				popover_1_changes.$$scope = { dirty, ctx };
			}

			if (!updating_open && dirty[0] & /*isOpen*/ 2048) {
				updating_open = true;
				popover_1_changes.open = /*isOpen*/ ctx[11];
				add_flush_callback(() => updating_open = false);
			}

			if (!updating_shrink && dirty[0] & /*isClosing*/ 4096) {
				updating_shrink = true;
				popover_1_changes.shrink = /*isClosing*/ ctx[12];
				add_flush_callback(() => updating_shrink = false);
			}

			popover_1.$set(popover_1_changes);

			if (!current || dirty[0] & /*wrapperStyle*/ 131072) {
				attr_dev(div, "style", /*wrapperStyle*/ ctx[17]);
			}

			if (dirty[0] & /*isOpen*/ 2048) {
				toggle_class(div, "open", /*isOpen*/ ctx[11]);
			}

			if (dirty[0] & /*isClosing*/ 4096) {
				toggle_class(div, "closing", /*isClosing*/ ctx[12]);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(popover_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(popover_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			/*popover_1_binding*/ ctx[58](null);
			destroy_component(popover_1);
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
	const dispatch = createEventDispatcher();
	const today = new Date();
	let popover;
	let { format = "#{m}/#{d}/#{Y}" } = $$props;
	let { start = new Date(1987, 9, 29) } = $$props;
	let { end = new Date(2020, 9, 29) } = $$props;
	let { selected = today } = $$props;
	let { dateChosen = false } = $$props;
	let { trigger = null } = $$props;
	let { selectableCallback = null } = $$props;
	let { weekStart = 0 } = $$props;

	let { daysOfWeek = [
		["Sunday", "Sun"],
		["Monday", "Mon"],
		["Tuesday", "Tue"],
		["Wednesday", "Wed"],
		["Thursday", "Thu"],
		["Friday", "Fri"],
		["Saturday", "Sat"]
	] } = $$props;

	let { monthsOfYear = [
		["January", "Jan"],
		["February", "Feb"],
		["March", "Mar"],
		["April", "Apr"],
		["May", "May"],
		["June", "Jun"],
		["July", "Jul"],
		["August", "Aug"],
		["September", "Sep"],
		["October", "Oct"],
		["November", "Nov"],
		["December", "Dec"]
	] } = $$props;

	let { style = "" } = $$props;
	let { buttonBackgroundColor = "#fff" } = $$props;
	let { buttonBorderColor = "#eee" } = $$props;
	let { buttonTextColor = "#333" } = $$props;
	let { highlightColor = "#f7901e" } = $$props;
	let { dayBackgroundColor = "none" } = $$props;
	let { dayTextColor = "#4a4a4a" } = $$props;
	let { dayHighlightedBackgroundColor = "#efefef" } = $$props;
	let { dayHighlightedTextColor = "#4a4a4a" } = $$props;
	internationalize({ daysOfWeek, monthsOfYear });

	let sortedDaysOfWeek = weekStart === 0
	? daysOfWeek
	: (() => {
			let dow = daysOfWeek.slice();
			dow.push(dow.shift());
			return dow;
		})();

	let highlighted = today;
	let shouldShakeDate = false;
	let shakeHighlightTimeout;
	let month = today.getMonth();
	let year = today.getFullYear();
	let isOpen = false;
	let isClosing = false;
	today.setHours(0, 0, 0, 0);

	function assignmentHandler(formatted) {
		if (!trigger) return;
		$$invalidate(1, trigger.innerHTML = formatted, trigger);
	}

	let monthIndex = 0;
	let { formattedSelected } = $$props;

	onMount(() => {
		$$invalidate(9, month = selected.getMonth());
		$$invalidate(10, year = selected.getFullYear());
	});

	function changeMonth(selectedMonth) {
		$$invalidate(9, month = selectedMonth);
		$$invalidate(7, highlighted = new Date(year, month, 1));
	}

	function incrementMonth(direction, day = 1) {
		if (direction === 1 && !canIncrementMonth) return;
		if (direction === -1 && !canDecrementMonth) return;
		let current = new Date(year, month, 1);
		current.setMonth(current.getMonth() + direction);
		$$invalidate(9, month = current.getMonth());
		$$invalidate(10, year = current.getFullYear());
		$$invalidate(7, highlighted = new Date(year, month, day));
	}

	function getDefaultHighlighted() {
		return new Date(selected);
	}

	const getDay = (m, d, y) => {
		let theMonth = months.find(aMonth => aMonth.month === m && aMonth.year === y);
		if (!theMonth) return null;

		// eslint-disable-next-line
		for (let i = 0; i < theMonth.weeks.length; ++i) {
			// eslint-disable-next-line
			for (let j = 0; j < theMonth.weeks[i].days.length; ++j) {
				let aDay = theMonth.weeks[i].days[j];
				if (aDay.month === m && aDay.day === d && aDay.year === y) return aDay;
			}
		}

		return null;
	};

	function incrementDayHighlighted(amount) {
		let proposedDate = new Date(highlighted);
		proposedDate.setDate(highlighted.getDate() + amount);
		let correspondingDayObj = getDay(proposedDate.getMonth(), proposedDate.getDate(), proposedDate.getFullYear());
		if (!correspondingDayObj || !correspondingDayObj.isInRange) return;
		$$invalidate(7, highlighted = proposedDate);

		if (amount > 0 && highlighted > lastVisibleDate) {
			incrementMonth(1, highlighted.getDate());
		}

		if (amount < 0 && highlighted < firstVisibleDate) {
			incrementMonth(-1, highlighted.getDate());
		}
	}

	function checkIfVisibleDateIsSelectable(date) {
		const proposedDay = getDay(date.getMonth(), date.getDate(), date.getFullYear());
		return proposedDay && proposedDay.selectable;
	}

	function shakeDate(date) {
		clearTimeout(shakeHighlightTimeout);
		$$invalidate(8, shouldShakeDate = date);

		shakeHighlightTimeout = setTimeout(
			() => {
				$$invalidate(8, shouldShakeDate = false);
			},
			700
		);
	}

	function assignValueToTrigger(formatted) {
		assignmentHandler(formatted);
	}

	function registerSelection(chosen) {
		if (!checkIfVisibleDateIsSelectable(chosen)) return shakeDate(chosen);

		// eslint-disable-next-line
		close();

		$$invalidate(0, selected = chosen);
		$$invalidate(24, dateChosen = true);
		assignValueToTrigger(formattedSelected);
		return dispatch("dateSelected", { date: chosen });
	}

	function handleKeyPress(evt) {
		if (keyCodesArray.indexOf(evt.keyCode) === -1) return;
		evt.preventDefault();

		switch (evt.keyCode) {
			case keyCodes.left:
				incrementDayHighlighted(-1);
				break;
			case keyCodes.up:
				incrementDayHighlighted(-7);
				break;
			case keyCodes.right:
				incrementDayHighlighted(1);
				break;
			case keyCodes.down:
				incrementDayHighlighted(7);
				break;
			case keyCodes.pgup:
				incrementMonth(-1);
				break;
			case keyCodes.pgdown:
				incrementMonth(1);
				break;
			case keyCodes.escape:
				// eslint-disable-next-line
				close();
				break;
			case keyCodes.enter:
				registerSelection(highlighted);
				break;
		}
	}

	function registerClose() {
		document.removeEventListener("keydown", handleKeyPress);
		dispatch("close");
	}

	function close() {
		popover.close();
		registerClose();
	}

	function registerOpen() {
		$$invalidate(7, highlighted = getDefaultHighlighted());
		$$invalidate(9, month = selected.getMonth());
		$$invalidate(10, year = selected.getFullYear());
		document.addEventListener("keydown", handleKeyPress);
		dispatch("open");
	}

	const writable_props = [
		"format",
		"start",
		"end",
		"selected",
		"dateChosen",
		"trigger",
		"selectableCallback",
		"weekStart",
		"daysOfWeek",
		"monthsOfYear",
		"style",
		"buttonBackgroundColor",
		"buttonBorderColor",
		"buttonTextColor",
		"highlightColor",
		"dayBackgroundColor",
		"dayTextColor",
		"dayHighlightedBackgroundColor",
		"dayHighlightedTextColor",
		"formattedSelected"
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Datepicker> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Datepicker", $$slots, ['default']);
	const monthSelected_handler = e => changeMonth(e.detail);
	const incrementMonth_handler = e => incrementMonth(e.detail);
	const dateSelected_handler = e => registerSelection(e.detail);

	function popover_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(6, popover = $$value);
		});
	}

	function popover_1_open_binding(value) {
		isOpen = value;
		$$invalidate(11, isOpen);
	}

	function popover_1_shrink_binding(value) {
		isClosing = value;
		$$invalidate(12, isClosing);
	}

	$$self.$set = $$props => {
		if ("format" in $$props) $$invalidate(25, format = $$props.format);
		if ("start" in $$props) $$invalidate(3, start = $$props.start);
		if ("end" in $$props) $$invalidate(4, end = $$props.end);
		if ("selected" in $$props) $$invalidate(0, selected = $$props.selected);
		if ("dateChosen" in $$props) $$invalidate(24, dateChosen = $$props.dateChosen);
		if ("trigger" in $$props) $$invalidate(1, trigger = $$props.trigger);
		if ("selectableCallback" in $$props) $$invalidate(26, selectableCallback = $$props.selectableCallback);
		if ("weekStart" in $$props) $$invalidate(27, weekStart = $$props.weekStart);
		if ("daysOfWeek" in $$props) $$invalidate(28, daysOfWeek = $$props.daysOfWeek);
		if ("monthsOfYear" in $$props) $$invalidate(5, monthsOfYear = $$props.monthsOfYear);
		if ("style" in $$props) $$invalidate(29, style = $$props.style);
		if ("buttonBackgroundColor" in $$props) $$invalidate(30, buttonBackgroundColor = $$props.buttonBackgroundColor);
		if ("buttonBorderColor" in $$props) $$invalidate(31, buttonBorderColor = $$props.buttonBorderColor);
		if ("buttonTextColor" in $$props) $$invalidate(32, buttonTextColor = $$props.buttonTextColor);
		if ("highlightColor" in $$props) $$invalidate(33, highlightColor = $$props.highlightColor);
		if ("dayBackgroundColor" in $$props) $$invalidate(34, dayBackgroundColor = $$props.dayBackgroundColor);
		if ("dayTextColor" in $$props) $$invalidate(35, dayTextColor = $$props.dayTextColor);
		if ("dayHighlightedBackgroundColor" in $$props) $$invalidate(36, dayHighlightedBackgroundColor = $$props.dayHighlightedBackgroundColor);
		if ("dayHighlightedTextColor" in $$props) $$invalidate(37, dayHighlightedTextColor = $$props.dayHighlightedTextColor);
		if ("formattedSelected" in $$props) $$invalidate(2, formattedSelected = $$props.formattedSelected);
		if ("$$scope" in $$props) $$invalidate(61, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		Month,
		NavBar,
		Popover,
		getMonths,
		formatDate,
		internationalize,
		keyCodes,
		keyCodesArray,
		onMount,
		createEventDispatcher,
		dispatch,
		today,
		popover,
		format,
		start,
		end,
		selected,
		dateChosen,
		trigger,
		selectableCallback,
		weekStart,
		daysOfWeek,
		monthsOfYear,
		style,
		buttonBackgroundColor,
		buttonBorderColor,
		buttonTextColor,
		highlightColor,
		dayBackgroundColor,
		dayTextColor,
		dayHighlightedBackgroundColor,
		dayHighlightedTextColor,
		sortedDaysOfWeek,
		highlighted,
		shouldShakeDate,
		shakeHighlightTimeout,
		month,
		year,
		isOpen,
		isClosing,
		assignmentHandler,
		monthIndex,
		formattedSelected,
		changeMonth,
		incrementMonth,
		getDefaultHighlighted,
		getDay,
		incrementDayHighlighted,
		checkIfVisibleDateIsSelectable,
		shakeDate,
		assignValueToTrigger,
		registerSelection,
		handleKeyPress,
		registerClose,
		close,
		registerOpen,
		months,
		visibleMonth,
		visibleMonthId,
		lastVisibleDate,
		firstVisibleDate,
		canIncrementMonth,
		canDecrementMonth,
		wrapperStyle
	});

	$$self.$inject_state = $$props => {
		if ("popover" in $$props) $$invalidate(6, popover = $$props.popover);
		if ("format" in $$props) $$invalidate(25, format = $$props.format);
		if ("start" in $$props) $$invalidate(3, start = $$props.start);
		if ("end" in $$props) $$invalidate(4, end = $$props.end);
		if ("selected" in $$props) $$invalidate(0, selected = $$props.selected);
		if ("dateChosen" in $$props) $$invalidate(24, dateChosen = $$props.dateChosen);
		if ("trigger" in $$props) $$invalidate(1, trigger = $$props.trigger);
		if ("selectableCallback" in $$props) $$invalidate(26, selectableCallback = $$props.selectableCallback);
		if ("weekStart" in $$props) $$invalidate(27, weekStart = $$props.weekStart);
		if ("daysOfWeek" in $$props) $$invalidate(28, daysOfWeek = $$props.daysOfWeek);
		if ("monthsOfYear" in $$props) $$invalidate(5, monthsOfYear = $$props.monthsOfYear);
		if ("style" in $$props) $$invalidate(29, style = $$props.style);
		if ("buttonBackgroundColor" in $$props) $$invalidate(30, buttonBackgroundColor = $$props.buttonBackgroundColor);
		if ("buttonBorderColor" in $$props) $$invalidate(31, buttonBorderColor = $$props.buttonBorderColor);
		if ("buttonTextColor" in $$props) $$invalidate(32, buttonTextColor = $$props.buttonTextColor);
		if ("highlightColor" in $$props) $$invalidate(33, highlightColor = $$props.highlightColor);
		if ("dayBackgroundColor" in $$props) $$invalidate(34, dayBackgroundColor = $$props.dayBackgroundColor);
		if ("dayTextColor" in $$props) $$invalidate(35, dayTextColor = $$props.dayTextColor);
		if ("dayHighlightedBackgroundColor" in $$props) $$invalidate(36, dayHighlightedBackgroundColor = $$props.dayHighlightedBackgroundColor);
		if ("dayHighlightedTextColor" in $$props) $$invalidate(37, dayHighlightedTextColor = $$props.dayHighlightedTextColor);
		if ("sortedDaysOfWeek" in $$props) $$invalidate(18, sortedDaysOfWeek = $$props.sortedDaysOfWeek);
		if ("highlighted" in $$props) $$invalidate(7, highlighted = $$props.highlighted);
		if ("shouldShakeDate" in $$props) $$invalidate(8, shouldShakeDate = $$props.shouldShakeDate);
		if ("shakeHighlightTimeout" in $$props) shakeHighlightTimeout = $$props.shakeHighlightTimeout;
		if ("month" in $$props) $$invalidate(9, month = $$props.month);
		if ("year" in $$props) $$invalidate(10, year = $$props.year);
		if ("isOpen" in $$props) $$invalidate(11, isOpen = $$props.isOpen);
		if ("isClosing" in $$props) $$invalidate(12, isClosing = $$props.isClosing);
		if ("monthIndex" in $$props) $$invalidate(39, monthIndex = $$props.monthIndex);
		if ("formattedSelected" in $$props) $$invalidate(2, formattedSelected = $$props.formattedSelected);
		if ("months" in $$props) $$invalidate(40, months = $$props.months);
		if ("visibleMonth" in $$props) $$invalidate(13, visibleMonth = $$props.visibleMonth);
		if ("visibleMonthId" in $$props) $$invalidate(14, visibleMonthId = $$props.visibleMonthId);
		if ("lastVisibleDate" in $$props) lastVisibleDate = $$props.lastVisibleDate;
		if ("firstVisibleDate" in $$props) firstVisibleDate = $$props.firstVisibleDate;
		if ("canIncrementMonth" in $$props) $$invalidate(15, canIncrementMonth = $$props.canIncrementMonth);
		if ("canDecrementMonth" in $$props) $$invalidate(16, canDecrementMonth = $$props.canDecrementMonth);
		if ("wrapperStyle" in $$props) $$invalidate(17, wrapperStyle = $$props.wrapperStyle);
	};

	let months;
	let visibleMonth;
	let visibleMonthId;
	let lastVisibleDate;
	let firstVisibleDate;
	let canIncrementMonth;
	let canDecrementMonth;
	let wrapperStyle;

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*start, end, selectableCallback, weekStart*/ 201326616) {
			 $$invalidate(40, months = getMonths(start, end, selectableCallback, weekStart));
		}

		if ($$self.$$.dirty[0] & /*month, year*/ 1536 | $$self.$$.dirty[1] & /*months*/ 512) {
			 {
				$$invalidate(39, monthIndex = 0);

				for (let i = 0; i < months.length; i += 1) {
					if (months[i].month === month && months[i].year === year) {
						$$invalidate(39, monthIndex = i);
					}
				}
			}
		}

		if ($$self.$$.dirty[1] & /*months, monthIndex*/ 768) {
			 $$invalidate(13, visibleMonth = months[monthIndex]);
		}

		if ($$self.$$.dirty[0] & /*year, month*/ 1536) {
			 $$invalidate(14, visibleMonthId = year + month / 100);
		}

		if ($$self.$$.dirty[0] & /*visibleMonth*/ 8192) {
			 lastVisibleDate = visibleMonth.weeks[visibleMonth.weeks.length - 1].days[6].date;
		}

		if ($$self.$$.dirty[0] & /*visibleMonth*/ 8192) {
			 firstVisibleDate = visibleMonth.weeks[0].days[0].date;
		}

		if ($$self.$$.dirty[1] & /*monthIndex, months*/ 768) {
			 $$invalidate(15, canIncrementMonth = monthIndex < months.length - 1);
		}

		if ($$self.$$.dirty[1] & /*monthIndex*/ 256) {
			 $$invalidate(16, canDecrementMonth = monthIndex > 0);
		}

		if ($$self.$$.dirty[0] & /*buttonBackgroundColor, style*/ 1610612736 | $$self.$$.dirty[1] & /*buttonBorderColor, buttonTextColor, highlightColor, dayBackgroundColor, dayTextColor, dayHighlightedBackgroundColor, dayHighlightedTextColor*/ 127) {
			 $$invalidate(17, wrapperStyle = `
    --button-background-color: ${buttonBackgroundColor};
    --button-border-color: ${buttonBorderColor};
    --button-text-color: ${buttonTextColor};
    --highlight-color: ${highlightColor};
    --day-background-color: ${dayBackgroundColor};
    --day-text-color: ${dayTextColor};
    --day-highlighted-background-color: ${dayHighlightedBackgroundColor};
    --day-highlighted-text-color: ${dayHighlightedTextColor};
    ${style}
  `);
		}

		if ($$self.$$.dirty[0] & /*format, selected*/ 33554433) {
			 {
				$$invalidate(2, formattedSelected = typeof format === "function"
				? format(selected)
				: formatDate(selected, format));
			}
		}
	};

	return [
		selected,
		trigger,
		formattedSelected,
		start,
		end,
		monthsOfYear,
		popover,
		highlighted,
		shouldShakeDate,
		month,
		year,
		isOpen,
		isClosing,
		visibleMonth,
		visibleMonthId,
		canIncrementMonth,
		canDecrementMonth,
		wrapperStyle,
		sortedDaysOfWeek,
		changeMonth,
		incrementMonth,
		registerSelection,
		registerClose,
		registerOpen,
		dateChosen,
		format,
		selectableCallback,
		weekStart,
		daysOfWeek,
		style,
		buttonBackgroundColor,
		buttonBorderColor,
		buttonTextColor,
		highlightColor,
		dayBackgroundColor,
		dayTextColor,
		dayHighlightedBackgroundColor,
		dayHighlightedTextColor,
		shakeHighlightTimeout,
		monthIndex,
		months,
		lastVisibleDate,
		firstVisibleDate,
		dispatch,
		today,
		assignmentHandler,
		getDefaultHighlighted,
		getDay,
		incrementDayHighlighted,
		checkIfVisibleDateIsSelectable,
		shakeDate,
		assignValueToTrigger,
		handleKeyPress,
		close,
		$$slots,
		monthSelected_handler,
		incrementMonth_handler,
		dateSelected_handler,
		popover_1_binding,
		popover_1_open_binding,
		popover_1_shrink_binding,
		$$scope
	];
}

class Datepicker extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(
			this,
			options,
			instance$6,
			create_fragment$6,
			safe_not_equal,
			{
				format: 25,
				start: 3,
				end: 4,
				selected: 0,
				dateChosen: 24,
				trigger: 1,
				selectableCallback: 26,
				weekStart: 27,
				daysOfWeek: 28,
				monthsOfYear: 5,
				style: 29,
				buttonBackgroundColor: 30,
				buttonBorderColor: 31,
				buttonTextColor: 32,
				highlightColor: 33,
				dayBackgroundColor: 34,
				dayTextColor: 35,
				dayHighlightedBackgroundColor: 36,
				dayHighlightedTextColor: 37,
				formattedSelected: 2
			},
			[-1, -1, -1]
		);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Datepicker",
			options,
			id: create_fragment$6.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*formattedSelected*/ ctx[2] === undefined && !("formattedSelected" in props)) {
			console.warn("<Datepicker> was created without expected prop 'formattedSelected'");
		}
	}

	get format() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set format(value) {
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

	get selected() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set selected(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get dateChosen() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set dateChosen(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get trigger() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set trigger(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get selectableCallback() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set selectableCallback(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get weekStart() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set weekStart(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get daysOfWeek() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set daysOfWeek(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get monthsOfYear() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set monthsOfYear(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get style() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set style(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get buttonBackgroundColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set buttonBackgroundColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get buttonBorderColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set buttonBorderColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get buttonTextColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set buttonTextColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get highlightColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set highlightColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get dayBackgroundColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set dayBackgroundColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get dayTextColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set dayTextColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get dayHighlightedBackgroundColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set dayHighlightedBackgroundColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get dayHighlightedTextColor() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set dayHighlightedTextColor(value) {
		throw new Error("<Datepicker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get formattedSelected() {
		throw new Error("<Datepicker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set formattedSelected(value) {
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

/* src/apps/dateUtil/DateUtil.svelte generated by Svelte v3.19.2 */

const { Object: Object_1$1 } = globals;
const file$7 = "src/apps/dateUtil/DateUtil.svelte";

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i];
	return child_ctx;
}

// (11:1) {#if selected}
function create_if_block$1(ctx) {
	let table;
	let each_value = Object.keys(/*result*/ ctx[1]);
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			table = element("table");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(table, "class", "svelte-rot1nt");
			add_location(table, file$7, 11, 2, 284);
		},
		m: function mount(target, anchor) {
			insert_dev(target, table, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(table, null);
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*parseInt, result, Object*/ 2) {
				each_value = Object.keys(/*result*/ ctx[1]);
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$4(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$4(child_ctx);
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
		id: create_if_block$1.name,
		type: "if",
		source: "(11:1) {#if selected}",
		ctx
	});

	return block;
}

// (13:2) {#each Object.keys(result) as key}
function create_each_block$4(ctx) {
	let tr;
	let td0;
	let t0_value = /*key*/ ctx[3] + "";
	let t0;
	let t1;
	let td1;
	let t2_value = parseInt(/*result*/ ctx[1][/*key*/ ctx[3]]) + "";
	let t2;

	const block = {
		c: function create() {
			tr = element("tr");
			td0 = element("td");
			t0 = text(t0_value);
			t1 = text(":");
			td1 = element("td");
			t2 = text(t2_value);
			attr_dev(td0, "class", "svelte-rot1nt");
			add_location(td0, file$7, 13, 7, 336);
			attr_dev(td1, "class", "svelte-rot1nt");
			add_location(td1, file$7, 13, 22, 351);
			attr_dev(tr, "class", "svelte-rot1nt");
			add_location(tr, file$7, 13, 3, 332);
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
			if (dirty & /*result*/ 2 && t0_value !== (t0_value = /*key*/ ctx[3] + "")) set_data_dev(t0, t0_value);
			if (dirty & /*result*/ 2 && t2_value !== (t2_value = parseInt(/*result*/ ctx[1][/*key*/ ctx[3]]) + "")) set_data_dev(t2, t2_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(tr);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$4.name,
		type: "each",
		source: "(13:2) {#each Object.keys(result) as key}",
		ctx
	});

	return block;
}

function create_fragment$7(ctx) {
	let main;
	let span;
	let t1;
	let updating_selected;
	let t2;
	let current;

	function datepicker_selected_binding(value) {
		/*datepicker_selected_binding*/ ctx[2].call(null, value);
	}

	let datepicker_props = { format: "#{d}/#{m}/#{Y}" };

	if (/*selected*/ ctx[0] !== void 0) {
		datepicker_props.selected = /*selected*/ ctx[0];
	}

	const datepicker = new Datepicker({ props: datepicker_props, $$inline: true });
	binding_callbacks.push(() => bind(datepicker, "selected", datepicker_selected_binding));
	let if_block = /*selected*/ ctx[0] && create_if_block$1(ctx);

	const block = {
		c: function create() {
			main = element("main");
			span = element("span");
			span.textContent = "Days Since:";
			t1 = space();
			create_component(datepicker.$$.fragment);
			t2 = space();
			if (if_block) if_block.c();
			add_location(span, file$7, 8, 1, 186);
			attr_dev(main, "class", "svelte-rot1nt");
			add_location(main, file$7, 7, 0, 178);
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

			if (!updating_selected && dirty & /*selected*/ 1) {
				updating_selected = true;
				datepicker_changes.selected = /*selected*/ ctx[0];
				add_flush_callback(() => updating_selected = false);
			}

			datepicker.$set(datepicker_changes);

			if (/*selected*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$1(ctx);
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
		id: create_fragment$7.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$7($$self, $$props, $$invalidate) {
	let selected;
	const writable_props = [];

	Object_1$1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DateUtil> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("DateUtil", $$slots, []);

	function datepicker_selected_binding(value) {
		selected = value;
		$$invalidate(0, selected);
	}

	$$self.$capture_state = () => ({ Datepicker, daysSince, selected, result });

	$$self.$inject_state = $$props => {
		if ("selected" in $$props) $$invalidate(0, selected = $$props.selected);
		if ("result" in $$props) $$invalidate(1, result = $$props.result);
	};

	let result;

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*selected*/ 1) {
			 $$invalidate(1, result = selected ? daysSince(selected.getTime()) : {});
		}
	};

	return [selected, result, datepicker_selected_binding];
}

class DateUtil extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DateUtil",
			options,
			id: create_fragment$7.name
		});
	}
}

/* src/layout/Page.svelte generated by Svelte v3.19.2 */
const file$8 = "src/layout/Page.svelte";

function create_fragment$8(ctx) {
	let main;
	let t0;
	let div1;
	let t1;
	let div0;
	let current;
	const header = new Header({ $$inline: true });
	const menu = new Menu({ $$inline: true });
	const dateutil = new DateUtil({ $$inline: true });

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
			add_location(div0, file$8, 9, 8, 234);
			attr_dev(div1, "id", "main-content");
			attr_dev(div1, "class", "svelte-75i1py");
			add_location(div1, file$8, 7, 4, 186);
			attr_dev(main, "class", "svelte-75i1py");
			add_location(main, file$8, 5, 0, 160);
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
		id: create_fragment$8.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$8($$self, $$props, $$invalidate) {
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Page> was created with unknown prop '${key}'`);
	});

	let { $$slots = {}, $$scope } = $$props;
	validate_slots("Page", $$slots, []);
	$$self.$capture_state = () => ({ Header, Menu, DateUtil });
	return [];
}

class Page extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Page",
			options,
			id: create_fragment$8.name
		});
	}
}

new Page({
	target: document.body
});
//# sourceMappingURL=bundle.js.map
