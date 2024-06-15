<script lang="ts">
	import QEditor from '../../components/tiles/QEditor.svelte';
    import { RS1 } from '../../lib/RS';

	let CLString =
    'Test|Name:[%=John]Your Name|XY:[#=123]A Number Value|Member:[@Test1=ListNum]TestMem|Set:[{Test1=ListNum,Test1Name}]TestSet|';
    let qList = new RS1.qList(CLString);    
    

        const modalContent = document.createElement('div');
        modalContent.style.position = 'absolute';
        modalContent.style.top = '40%';
        modalContent.style.left = '50%';
        modalContent.style.transform = 'translate(-50%, -50%)';
        modalContent.style.backgroundColor = 'rgba(249, 240, 246)';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.zIndex = '1';
        document.body.appendChild(modalContent);

    if (modalContent) {
    const editorComponent = new QEditor({
            target: modalContent,
            props: {
                qList,
            },
        });
        editorComponent.$on('close', () => {
        modalContent.remove();
        // modalBackground.remove();
        //unsubscribe();
    });
    }

</script>

<!-- <QEditor {CLString} /> -->

<!-- <div class="modal-content" /> -->


