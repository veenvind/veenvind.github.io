<script>
    import Header from './Header.svelte';
    import Menu from './Menu.svelte';
    import DateUtil from '../apps/dateUtil/DateUtil.svelte';
</script>
<main>
    <Header />
    <div id='main-content'>
        <Menu/>
        <div id='content'>
            <DateUtil />
        </div>
    </div>
</main>
<style>
    main {
        display: flex;
        flex-direction: column;
    }
    #main-content {
        flex: 1 1 auto;
        display:flex;
        flex-direction: row;
    }
    #content {
        flex: 1 1 auto;
    }
</style>