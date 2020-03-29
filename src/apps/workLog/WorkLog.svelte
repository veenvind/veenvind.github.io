<script>
    import {onMount} from 'svelte';
    let periods = Array(20).fill(0).map((val, index) => ({
        id: index,
        checked: false
    }));

    function getKey() {
        return new Date().toISOString().split('T')[0];
    }

    onMount(() => {
        const key = getKey();
        const obj = localStorage.getItem('__appData') ? JSON.parse(localStorage.getItem('__appData')) : {};
        if (!obj.workLog) {
            obj.workLog = {};
        }
        if (!obj.workLog[key]) {
            obj.workLog[key] = Array(20).fill(0).reduce((acc, val, index) => {
                acc[index] = {
                id: index,
                checked: false
                };
                return acc;
            }, {});

            localStorage.setItem('__appData', JSON.stringify(obj));
        }
        periods = obj.workLog[key];
    });

    function onSelect(periodId) {
        const obj = localStorage.getItem('__appData') ? JSON.parse(localStorage.getItem('__appData')) : {};

        obj.workLog[this.getKey()][periodId].checked = true;
        localStorage.setItem('__appData', JSON.stringify(obj));
    }
</script>
<div class='work-log'>
    <header>Work Log</header>
    {#each periods as period(period.id)}
        <div class='period'>
            <input type='checkbox' id='period{period.id}' name='period{{periodId}}' value='{period.id}' [checked]='period.checked'/>
            <label for='period{period.id}'>period {period.id + 1}</label>
        </div>
     {/each}
</div>
<style>
.work-log {
    padding: 10px;
    width: 1000px;
}
.period {
        display: inline-block;
        width: 180px;
        padding: 5px 10px;;
    }
</style>